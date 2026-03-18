

## Plan: Backfill lịch sử Swap từ on-chain vào database

### Phân tích hiện tại

Dữ liệu donations cho angeldieungoc đã chính xác:
- **Nhận**: 834,839,840 CAMLY (163 lệnh), 7,656 USDT (30 lệnh), 0.148 BTCB, 178 FUN
- **Tặng**: 705,922,219 CAMLY (93 lệnh), 10,525 USDT (91 lệnh)
- **Số dư GD**: +128,917,621 CAMLY

Nhưng user nói chỉ còn ~80M CAMLY → **~48M CAMLY đã swap** qua PancakeSwap trong FUN.RICH nhưng chưa được ghi vào DB (vì bảng `swap_transactions` mới tạo, đang trống).

### Giải pháp: Tạo Edge Function backfill swap history

**1. Tạo edge function `backfill-swap-transactions`**
- Nhận `user_id` hoặc quét tất cả users có `public_wallet_address`
- Dùng **Moralis API** (đã có key) để lấy lịch sử token transfers của wallet
- Phát hiện giao dịch swap: các tx mà wallet vừa gửi token A vừa nhận token B trong cùng 1 tx_hash (đặc trưng của PancakeSwap)
- Lọc chỉ các token FUN.RICH hỗ trợ (USDT, BNB, BTCB, CAMLY, FUN)
- Kiểm tra trùng lặp (tx_hash đã tồn tại) trước khi insert
- Insert vào bảng `swap_transactions`

**2. Xử lý logic phát hiện swap**
- Gọi Moralis `erc20/transfers` cho wallet address
- Group transfers theo `transaction_hash`
- Nếu 1 tx có cả transfer OUT (from = wallet) và transfer IN (to = wallet) → đó là swap
- Ghi `from_symbol`, `to_symbol`, `from_amount`, `to_amount` tương ứng

**3. Files cần tạo/sửa**
- **Tạo**: `supabase/functions/backfill-swap-transactions/index.ts` — edge function chính
- Không cần sửa UI hay hook (đã hỗ trợ hiển thị swap từ bước trước)

### Lưu ý
- Moralis API có rate limit, nên xử lý từng user một
- Backfill sẽ ghi tất cả swap on-chain (không phân biệt được swap qua FUN.RICH vs MetaMask), nhưng vì user nói "miễn là trong fun.rich" và wallet này chủ yếu dùng qua platform nên chấp nhận được
- Sau khi backfill xong, bảng tổng kết sẽ tự động cập nhật vì RPC `get_user_donation_summary` đã gộp swap data

