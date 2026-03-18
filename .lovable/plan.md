

## Plan: Sửa backfill-wallet-transfers dùng BSC RPC thay Moralis

### Vấn đề

1. **Moralis API hết quota** (free plan daily limit) → trả về 0 transfers, không thể backfill
2. **Profile nganguyen có 2 ví khác nhau**: `public_wallet_address` = `0xa77ba...c9`, `wallet_address` = `0x6c0ab...81` (đuôi 81). Khi gọi bằng `user_id`, function chỉ scan ví đầu tiên (public) — bỏ sót ví thứ 2

### Giải pháp

**Sửa `supabase/functions/backfill-wallet-transfers/index.ts`**:

1. **Thêm BSC RPC fallback**: Khi Moralis trả 401/lỗi, tự chuyển sang dùng BSC RPC (`https://bsc-dataseed.binance.org`) với `eth_getLogs` để lấy ERC20 Transfer events trực tiếp — miễn phí, không giới hạn
2. **Scan tất cả ví của profile**: Khi truyền `user_id`, scan CẢ `public_wallet_address`, `wallet_address` và `external_wallet_address` (nếu khác nhau) thay vì chỉ lấy cái đầu tiên
3. **Logic BSC RPC**:
   - Với mỗi known token contract, gọi `eth_getLogs` filter theo Transfer event topic + wallet address (as sender hoặc receiver)
   - Parse log data để lấy amount, from, to, block number
   - Gọi `eth_getBlockByNumber` để lấy timestamp
   - Insert vào `wallet_transfers` giống logic hiện tại (exclude donations, swaps, duplicates)

### Files cần sửa
- **Sửa**: `supabase/functions/backfill-wallet-transfers/index.ts` — thêm BSC RPC fallback + multi-wallet scan
- Deploy lại và gọi cho user `25be7e29-a898-4d93-8efe-c11c0491daf7`

### Kết quả
- Lệnh nhận 180M CAMLY và lệnh chuyển ra sẽ xuất hiện trong lịch sử giao dịch với badge "Chuyển vào" / "Chuyển ra"
- Bảng tổng kết sẽ tự cập nhật qua RPC `get_user_donation_summary`

