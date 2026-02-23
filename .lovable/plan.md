
# Hiển Thị Video Live và Nút Xem Live Trên Bài Đăng Feed

## Vấn đề

Khi bạn đang phát live, bài đăng trên feed chỉ hiển thị text (tiêu đề). Không có:
- Video preview hoặc thumbnail của buổi live
- Nút "Xem trực tiếp" để bạn bè bấm vào xem
- Badge "LIVE" nổi bật trên bài đăng

Nguyên nhân: Bài đăng live được tạo chỉ với `content` (text) và `metadata` (chứa thông tin channel, live_status). Không có `media_urls`, `image_url`, hay `video_url`. Component `FacebookPostCard` không có logic đặc biệt để render UI cho bài đăng đang live.

## Giải pháp

Thêm một component `LivePostEmbed` hiển thị bên trong `FacebookPostCard` khi bài đăng có `post_type === 'live'` và `metadata.live_status === 'live'`.

## Chi tiết kỹ thuật

### 1. Tạo component mới: `src/components/feed/LivePostEmbed.tsx`

Component này sẽ hiển thị:
- Khung preview với nền gradient tối (giống giao diện xem live)
- Badge **LIVE** đỏ nhấp nháy (animated pulse) ở góc trên
- Số người đang xem (`viewer_count` từ metadata)
- Thumbnail nếu có (`metadata.thumbnail_url`), hoặc icon camera/video lớn nếu chưa có
- Nút **"Xem trực tiếp"** nổi bật, khi bấm sẽ điều hướng đến `/live/[session_id]`

Props:
- `metadata`: chứa `live_session_id`, `live_status`, `channel_name`, `viewer_count`, `thumbnail_url`
- `hostName`: tên người phát

### 2. Cập nhật `src/components/feed/FacebookPostCard.tsx`

Thêm logic render `LivePostEmbed` ngay trước `MediaGrid`:
- Điều kiện: `post.post_type === 'live'` VÀ `post.metadata?.live_status === 'live'`
- Khi live đã kết thúc (`live_status !== 'live'`), hiển thị media bình thường (video replay nếu có)

### 3. Cập nhật `src/modules/live/liveService.ts`

Đảm bảo khi tạo live session, `metadata` của post chứa `live_session_id` để component có thể tạo link xem live:
- Sau khi insert live_session thành công, update post metadata thêm `live_session_id`

## Kết quả mong đợi

- Bạn bè thấy bài đăng live với badge LIVE đỏ nhấp nháy
- Có nút "Xem trực tiếp" bấm vào sẽ đến trang xem live
- Hiển thị số người đang xem
- Khi live kết thúc, nếu có video replay thì hiển thị video bình thường
