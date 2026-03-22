
Mục tiêu: sửa tận gốc để mọi giao dịch từ ví ngoài tặng user trong fun.rich đều tự hiện ở feed/chuông/chat, đồng thời backfill toàn bộ các lệnh đã bị bỏ sót.

1. Kết luận sau khi kiểm tra
- Đây là lỗi hệ thống diện rộng, không phải riêng một user.
- Hiện có 2182 donation từ ví ngoài đã vào database, nhưng chỉ 2 lệnh có bài `gift_celebration`, và chỉ 1 lệnh có notification gắn với post.
- `fast-scan-donations` đang không có log chạy gần đây, nên luồng quét nhanh gần như không hoạt động.
- `scan-my-incoming` hiện chỉ ghi vào `donations`, không tạo post/notification/chat.
- `auto-backfill-donations` hiện chỉ backfill post cho donation có `sender_id`, nên toàn bộ ví ngoài (`sender_id = null`) bị bỏ qua.

2. Cách sửa đề xuất
- Chuẩn hóa 1 luồng xử lý chung cho donation sau khi đã ghi nhận thành công:
  - tạo `gift_celebration` post
  - tạo `donation` notification
  - tạo tin nhắn chat/thông báo hệ thống
  - gắn `metadata` cho external gift: `is_external`, `sender_address`, `sender_name`
- Dùng lại luồng này cho tất cả nơi ghi nhận donation:
  - `auto-scan-donations`
  - `fast-scan-donations`
  - `scan-my-incoming`
  - `auto-backfill-donations`

3. Những phần sẽ cập nhật
- `supabase/functions/scan-my-incoming/index.ts`
  - thêm tạo post/notification/chat sau khi insert donation
  - hỗ trợ external wallet đầy đủ, không chỉ insert bản ghi donation
- `supabase/functions/auto-backfill-donations/index.ts`
  - bỏ điều kiện bắt buộc `sender_id`
  - backfill được cả external donations
  - tạo post với `user_id = recipient_id` khi sender là ví ngoài
  - thêm metadata để frontend nhận diện đúng ví ngoài
- `supabase/functions/fast-scan-donations/index.ts`
  - rà lại nhánh tạo post/notification/chat cho external
  - đảm bảo nội dung post + metadata đồng nhất với scanner chính
- `supabase/functions/auto-scan-donations/index.ts`
  - giữ làm nguồn quét chính, nhưng đồng bộ lại với helper chung để tránh lệch logic giữa các function
- `supabase/functions/_shared/...`
  - tách helper dùng chung để tránh mỗi function tự tạo post/noti theo kiểu khác nhau

4. Backfill dữ liệu cũ
- Chạy backfill cho toàn bộ donation `is_external = true` đang thiếu:
  - post `gift_celebration`
  - notification
  - metadata external trên post
- Backfill sẽ dựa theo `tx_hash` để chống tạo trùng.
- Phạm vi hiện tại theo dữ liệu kiểm tra: đang thiếu khoảng 2180 post external.

5. Vận hành để không tái diễn
- Kiểm tra và thêm lịch chạy cho `fast-scan-donations` nếu đang thiếu.
- Giữ `auto-scan-donations` như lớp dự phòng.
- Có thể thêm một job backfill định kỳ ngắn hạn để tự vá các donation nào lỡ ghi vào `donations` nhưng chưa sinh post/noti.

6. Kết quả mong đợi sau khi triển khai
- Mọi ví ngoài chuyển tặng user sẽ tự hiện ở feed.
- User nhận sẽ có chuông thông báo donation.
- Các lệnh cũ đã bị mất cũng sẽ được hiện lại.
- Card quà tặng sẽ tiếp tục hiển thị đúng là ví ngoài nhờ metadata đã được backfill.

7. Chi tiết kỹ thuật
```text
donations (is_external = true, sender_id = null)
        ↓
shared donation-effects helper
        ├── posts(post_type = gift_celebration, metadata.is_external = true)
        ├── notifications(type = donation, actor_id fallback = recipient_id)
        └── messages(system/self conversation cho ví ngoài)
```

Lưu ý triển khai
- Không sửa schema database nếu chưa cần; phần này chủ yếu là sửa logic function + cập nhật dữ liệu.
- Dùng `tx_hash` làm khóa chống trùng trên toàn bộ quá trình backfill.
- Với external gifts, frontend hiện đã đọc `post.metadata.is_external` và `sender_address`, nên trọng tâm là bảo đảm backend luôn ghi đủ dữ liệu này.
