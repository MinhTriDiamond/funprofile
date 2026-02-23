

# Thông Báo Bạn Bè Khi Bắt Đầu Live

## Phân tích hiện tại

### 1. Bài đăng Live trên Feed - DA HOAT DONG
Khi bạn bắt đầu live, hệ thống tự tạo bài đăng với `post_type: 'live'` và `moderation_status: approved`. Bài này xuất hiện trên News Feed của tất cả mọi người (hoặc chỉ bạn bè nếu chọn privacy "friends"). Vậy bạn bè **đã có thể thấy** bài đăng Live trên feed.

### 2. Thông báo cho bạn bè - CHUA CO
Hiện tại **không có cơ chế gửi thông báo** đến bạn bè khi ai đó bắt đầu live. Hệ thống thông báo hỗ trợ nhiều loại (like, comment, friend_request, donation...) nhưng chưa có loại `live_started`.

## Giải pháp

Thêm tính năng gửi thông báo đến tất cả bạn bè khi người dùng bắt đầu phát trực tiếp.

### Bước 1: Cập nhật Database

- Thêm `'live_started'` vào constraint `notifications_type_check` để hỗ trợ loại thông báo mới.

### Bước 2: Tạo Edge Function `notify-live-started`

File: `supabase/functions/notify-live-started/index.ts`

- Nhận `session_id` và `post_id` từ client
- Xác thực người gọi là host của live session
- Truy vấn danh sách bạn bè (bảng `friendships` với `status = 'accepted'`)
- Tạo thông báo hàng loạt (batch insert) cho tất cả bạn bè với:
  - `type: 'live_started'`
  - `actor_id`: ID người phát live
  - `post_id`: ID bài đăng live (để khi bấm vào thông báo có thể điều hướng)

### Bước 3: Gọi Edge Function từ Client

File sửa: `src/modules/live/liveService.ts`

- Sau khi `createLiveSession` thành công, gọi edge function `notify-live-started` với `session_id` và `post_id`
- Gọi không chặn (fire-and-forget) để không ảnh hưởng trải nghiệm người phát

### Bước 4: Cập nhật UI Thông Báo

File sửa: `src/components/layout/notifications/` (các file liên quan)

- Thêm xử lý hiển thị cho loại thông báo `live_started`
- Icon: biểu tượng phát trực tiếp (Radio) màu đỏ
- Nội dung: "[Tên bạn bè] đang phát trực tiếp"
- Khi bấm vào: điều hướng đến `/live/[sessionId]` hoặc bài đăng live

## Chi tiết kỹ thuật

### Database Migration
```sql
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY(ARRAY[...existing types..., 'live_started']));
```

### Edge Function Flow
```text
Client (sau khi createLiveSession)
  |
  v
notify-live-started (Edge Function)
  |-- Verify auth + host ownership
  |-- Query friendships (status = 'accepted')
  |-- Batch insert notifications for all friends
  v
Realtime subscription -> UI hiển thị thông báo
```

### Hiển thị thông báo
- Loại: `live_started`
- Icon: Radio (lucide-react) với nền đỏ
- Text: "[username] đang phát trực tiếp"
- Action: Điều hướng đến trang xem live

