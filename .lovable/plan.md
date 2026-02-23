
# Cải Thiện Điều Hướng Thông Báo Live Stream

## Tình trạng hiện tại

Sau khi kiểm tra kỹ mã nguồn, hệ thống đã hoạt động đúng ở 2 phần:

1. **Bài đăng Live trên Feed**: Khi bạn phát trực tiếp, một bài đăng với trạng thái "live" được tạo tự động. Bạn bè sẽ thấy bài đăng này trên Feed với huy hiệu LIVE đỏ nhấp nháy và nút "Xem trực tiếp".

2. **Gửi thông báo cho bạn bè**: Edge function `notify-live-started` tự động gửi thông báo "đang phát trực tiếp" cho tất cả bạn bè khi bạn bắt đầu live.

## Vấn đề phát hiện

Khi bạn bè bấm vào thông báo "đang phát trực tiếp", ứng dụng điều hướng đến trang bài đăng (`/post/...`) thay vì vào thẳng phiên live (`/live/...`). Điều này khiến trải nghiệm kém trực quan -- bạn bè phải bấm thêm một lần nữa mới vào được live stream.

## Giải pháp

Thêm xử lý đặc biệt cho thông báo `live_started` để điều hướng thẳng vào phiên live.

## Chi tiết kỹ thuật

### File cần sửa: `src/components/layout/NotificationDropdown.tsx`

Tại hàm `handleNotificationClick` (dòng 169-180), thêm case cho `live_started`:

Trước:
```
if (notification.post_id) {
  navigate(`/post/${notification.post_id}`);
}
```

Sau:
```
if (notification.type === 'live_started' && notification.post_id) {
  // Truy vấn live_sessions theo post_id để lấy session id
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, status')
    .eq('post_id', notification.post_id)
    .single();
  
  if (session?.status === 'live') {
    navigate(`/live/${session.id}`);
  } else {
    navigate(`/post/${notification.post_id}`);
  }
} else if (notification.post_id) {
  navigate(`/post/${notification.post_id}`);
}
```

Logic: Nếu phiên live vẫn đang diễn ra, điều hướng thẳng vào phòng live. Nếu đã kết thúc, điều hướng đến bài đăng để xem replay.

Chỉ sửa 1 file duy nhất.
