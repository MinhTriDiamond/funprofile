

# Backfill 8 Giao Dịch Của angelanhnguyet Vào Hệ Thống

## Vấn đề

8 giao dịch từ ví `0xf3987133929D43136A9057ff8ce4C384e1C8C7A6` (user **angelanhnguyet**) đã thực hiện on-chain nhưng không được ghi nhận trong database, dẫn đến:
- Không hiển thị trong lịch sử giao dịch (trang /donations)
- Người nhận không có thông báo
- Không có bài viết gift_celebration trên feed

## Giải pháp

Tạo Edge Function `backfill-tx-donations` nhận danh sách tx_hash + sender_address, tự động:
1. Query Moralis API để decode từng giao dịch (BSC mainnet + testnet)
2. Xác định người nhận qua địa chỉ ví trong bảng profiles
3. Tạo bản ghi donations (status = confirmed)
4. Tạo bài viết gift_celebration post
5. Tạo thông báo cho người nhận

## Chi tiết kỹ thuật

### Bước 1: Tạo Edge Function `backfill-tx-donations`

**Input:**
```json
{
  "tx_hashes": ["0xcde17a2f...", "0xf5d28d60..."],
  "sender_address": "0xf3987133929D43136A9057ff8ce4C384e1C8C7A6",
  "sender_username": "angelanhnguyet"
}
```

**Logic:**
- Tra cứu sender profile từ DB
- Xây dựng map wallet -> profile cho tất cả user
- Kiểm tra trùng lặp (skip nếu tx_hash đã tồn tại trong donations)
- Với mỗi tx_hash: gọi Moralis verbose transaction API (thử BSC mainnet rồi testnet)
- Parse ERC20 Transfer events từ logs (topic0 = Transfer event signature)
- Chỉ xử lý token đã biết: CAMLY, USDT, BTCB, FUN
- Parse amount theo decimals của từng token
- Tạo donation record, gift_celebration post, notification

**Output:**
```json
{
  "total_processed": 8,
  "created": 7,
  "skipped": 1,
  "errors": 0,
  "results": [...]
}
```

### Bước 2: Gọi Edge Function

Sau khi deploy, gọi function với 8 tx hash để backfill dữ liệu.

### Files cần tạo/sửa

1. **Tạo mới**: `supabase/functions/backfill-tx-donations/index.ts`
   - Edge function xử lý backfill qua Moralis API
   - Không yêu cầu JWT (dùng service role key nội bộ)
   - Tái sử dụng logic từ `manual-create-donation` và `detect-incoming-transfers`

