
# Tự động phục hồi giao dịch bị thiếu (Auto-backfill donations)

## Tình trạng hiện tại
- Có **16 giao dịch** đã confirmed trong bảng `transactions` nhưng thiếu record trong bảng `donations`
- Nguyên nhân: edge function `record-donation` bị lỗi mạng hoặc timeout sau khi blockchain confirm
- Hiện có edge function `backfill-donations` nhưng phải admin vào bấm thủ công

## Giải pháp: Tạo edge function chạy tự động mỗi 5 phút

### Buoc 1: Tạo edge function `auto-backfill-donations`
Tạo edge function mới **không cần admin auth** (dùng service role key nội bộ, chỉ gọi được từ cron):
- Quét bảng `transactions` (status = confirmed) so sánh với `donations` (theo tx_hash)
- Với mỗi giao dịch thiếu:
  - Map `to_address` sang `recipient_id` qua bảng `profiles.wallet_address`
  - Tạo donation record đầy đủ (sender_id, recipient_id, amount, token, tx_hash...)
  - Tạo notification cho người nhận
- Bỏ qua nếu không map được recipient (giao dịch ra ngoài hệ thống)
- Log kết quả để theo dõi

### Buoc 2: Cài đặt pg_cron chạy tự động mỗi 5 phút
Bật extension `pg_cron` và `pg_net`, tạo lịch gọi edge function mỗi 5 phút để tự động phát hiện và phục hồi giao dịch thiếu.

### Buoc 3: Chạy backfill ngay 16 giao dịch hiện tại
Sau khi deploy, gọi edge function 1 lần để phục hồi 16 giao dịch đang thiếu.

## Chi tiết kỹ thuật

### Edge function `auto-backfill-donations`:
- Xác thực bằng `SUPABASE_SERVICE_ROLE_KEY` (không cần JWT user)
- Chấp nhận cả cron call (không auth header) và admin call (có auth header)
- Giới hạn xử lý 50 giao dịch mỗi lần để tránh timeout
- Tạo donation record giống format của `record-donation` (card_theme, card_sound, confirmed_at...)
- Tạo notification type "donation" cho recipient

### Cron schedule:
- Chạy mỗi 5 phút: `*/5 * * * *`
- Gọi qua `net.http_post` với service role auth
