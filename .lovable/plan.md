

## Backfill giao dịch tặng outgoing (trước tháng 2/2026)

### Vấn đề
- angelaivan đăng ký ngày 06/11/2025, nhưng donation đầu tiên trong DB là 11/02/2026
- Khoảng 3 tháng (11/2025 → 01/2026) giao dịch chuyển token từ ví angelaivan đến các user fun.rich khác **không được ghi nhận** vì:
  - `fast-scan-donations` chỉ quét 100 transfer mới nhất toàn hệ thống
  - `scan-my-incoming` chỉ quét giao dịch **đến** ví user, không quét giao dịch **đi**
  - Không có function nào backfill outgoing donations

### Giải pháp — Tạo Edge Function `backfill-outgoing-donations`

**File: `supabase/functions/backfill-outgoing-donations/index.ts`**

Quét toàn bộ ERC20 transfers **từ** ví của 1 user cụ thể, tìm các giao dịch gửi đến ví fun.rich khác chưa có trong `donations`:

1. **Input**: `user_id` hoặc `wallet_address` (admin-only, no JWT required)
2. **Quét đa nguồn**: Moralis API với pagination (cursor) để lấy **toàn bộ** lịch sử, không chỉ 100 gần nhất. Fallback sang BSCScan nếu Moralis fail.
3. **Lọc outgoing**: Chỉ lấy transfers FROM user's wallet TO fun.rich wallets (tra cứu cả 3 trường ví: `public_wallet_address`, `wallet_address`, `external_wallet_address`)
4. **Dedup**: So sánh `tx_hash` với `donations` table, bỏ qua đã có
5. **Lọc thời gian**: Chỉ lấy giao dịch sau `userCreatedAt` (2025-11-06)
6. **Insert**: Tạo donation records với `sender_id = user_id`, `recipient_id = matched profile`, `is_external = false`
7. **Tạo posts**: Tự động tạo `gift_celebration` posts cho mỗi donation mới

### Chi tiết kỹ thuật

```text
Flow:
1. GET profile → lấy tất cả wallet addresses
2. Moralis /erc20/transfers?chain=bsc&limit=100 + cursor pagination (tối đa 10 pages = 1000 tx)  
3. Filter: from_address ∈ user_wallets AND to_address ∈ fun.rich_wallets
4. Filter: block_timestamp >= userCreatedAt
5. Filter: tx_hash NOT IN existing donations
6. INSERT into donations + posts
```

**Khác biệt với `scan-my-incoming`**: Function mới quét **outgoing** thay vì incoming, và sử dụng **cursor pagination** của Moralis để lấy toàn bộ lịch sử thay vì chỉ 100 gần nhất.

### Kết quả
- Tất cả giao dịch tặng từ angelaivan (và bất kỳ user nào) trước tháng 2/2026 sẽ được ghi nhận
- Function có thể chạy cho bất kỳ user nào bị thiếu dữ liệu
- Summary (tổng đã tặng) sẽ cập nhật chính xác

