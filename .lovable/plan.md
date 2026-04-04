

# Backfill 6 bài viết chúc mừng BTC & CAMLY còn thiếu

## Vấn đề

Có **6 giao dịch** từ `funtreasury` trong ngày hôm nay đã ghi nhận trong `donations` nhưng **thiếu bài viết `gift_celebration`** trên trang chủ:

| # | Token | Số lượng | Người nhận | Thời gian |
|---|-------|----------|------------|-----------|
| 1 | CAMLY | 2,895,159,940 | angelgiau | 18:40 |
| 2 | BTC | 1.47027 | angeldieungoc | 18:34 |
| 3 | BTC | 0.01071 | angelthutrang | 18:27 |
| 4 | CAMLY | 68,386,000 | angelthutrang | 18:26 |
| 5 | BTC | 0.73424 | angelthanhtien | 18:21 |
| 6 | CAMLY | 1,490,143,240 | angelthanhtien | 18:19 |

## Giải pháp

Sử dụng công cụ INSERT để tạo 6 bài viết `gift_celebration` vào bảng `posts`, sau đó cập nhật `post_id` trong bảng `donations` để liên kết.

### Chi tiết kỹ thuật

Mỗi bài viết sẽ bao gồm:
- `user_id` = sender ID (funtreasury)
- `post_type` = `'gift_celebration'`
- `tx_hash` = TX hash từ donation
- `gift_sender_id`, `gift_recipient_id`, `gift_token`, `gift_amount`, `gift_message` = dữ liệu từ donation
- `is_highlighted` = true
- `visibility` = `'public'`
- `moderation_status` = `'approved'`
- `content` = Nội dung tự động tạo theo format chuẩn

Cần tạm tắt trigger `enforce_post_rate_limit` trước khi INSERT, sau đó bật lại.

## Kết quả mong đợi

- 6 bài viết chúc mừng xuất hiện trên trang chủ (feed)
- Hiển thị giống các bài chúc mừng BTC và CAMLY đã có (như hình con gửi)

