

## Hiển thị giao dịch từ ví ngoài ngay lập tức (Moralis Streams Webhook)

### Vấn đề hiện tại
Hệ thống `auto-scan-donations` quét 10 ví mỗi 5 phút theo round-robin. Với 527+ ví, mất ~4.4 giờ để quét hết 1 vòng. Giao dịch từ ví ngoài có thể chờ rất lâu mới hiển thị.

### Giải pháp: Moralis Streams Webhook
Tạo 1 edge function mới `moralis-webhook` nhận push notification realtime từ Moralis khi có token transfer TO bất kỳ ví fun.rich nào. Giao dịch sẽ hiển thị **trong vài giây** thay vì chờ hàng giờ.

### Luồng hoạt động mới

```text
Ví ngoài chuyển token → BSC blockchain confirms
  → Moralis Streams phát hiện (realtime)
  → POST webhook đến moralis-webhook edge function
  → Edge function:
      ├─ Xác thực webhook signature (bảo mật)
      ├─ Lọc: chỉ xử lý known tokens (USDT, BTCB, CAMLY, FUN)
      ├─ Tìm recipient profile từ to_address
      ├─ Kiểm tra trùng tx_hash (dedup)
      ├─ Insert donation + gift_celebration post + notification + chat message
      └─ Frontend nhận realtime qua Supabase Realtime → hiện thông báo ngay
```

### Chi tiết kỹ thuật

#### 1. Tạo edge function `moralis-webhook`
- Nhận POST từ Moralis Streams với payload chứa ERC20 transfer events
- Xác thực bằng Moralis webhook signature (header `x-signature`) + secret key
- Xử lý giống logic hiện có trong `auto-scan-donations`: tạo donation, post, notification, chat message
- Không cần JWT auth (webhook từ Moralis)

#### 2. Tạo edge function `setup-moralis-stream` (chạy 1 lần)
- Gọi Moralis Streams API để đăng ký stream:
  - Theo dõi ERC20 Transfer events trên BSC Mainnet + Testnet
  - Filter: `to_address` IN danh sách tất cả ví fun.rich
  - Webhook URL: edge function `moralis-webhook`
- Cần chạy 1 lần để setup, và chạy lại khi có user mới đăng ký ví

#### 3. Cập nhật auto-sync ví mới
- Khi user thêm/thay đổi `public_wallet_address`, tự động cập nhật Moralis Stream để bao gồm ví mới

#### 4. Giữ nguyên `auto-scan-donations` làm backup
- Round-robin scan vẫn chạy để bắt các giao dịch webhook bị miss
- Không thay đổi logic hiện tại

### Files cần tạo/sửa
1. **`supabase/functions/moralis-webhook/index.ts`** — Edge function mới nhận webhook realtime từ Moralis
2. **`supabase/functions/setup-moralis-stream/index.ts`** — Edge function setup Moralis Stream (chạy 1 lần)
3. Cần thêm secret `MORALIS_STREAM_SECRET` để xác thực webhook signature

