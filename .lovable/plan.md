
# Hiển thị Video Live Trực Tiếp Trên Bài Post

## Tổng quan

Hiện tại `LivePostEmbed` chỉ hiển thị placeholder tĩnh (icon + "Xem trực tiếp"). Sẽ cải tiến để hiển thị video live stream thực tế ngay trong bài post, đồng thời vẫn cho phép click vào để xem full-screen.

## Cách tiếp cận

Tạo một mini Agora RTC viewer nhúng trực tiếp trong `LivePostEmbed`. Component sẽ:
1. Dùng IntersectionObserver để chỉ kết nối Agora khi bài post hiện trên màn hình (tiết kiệm tài nguyên)
2. Hiển thị video stream trực tiếp từ host
3. Mặc định tắt tiếng (muted) để tránh phiền
4. Click vào sẽ navigate đến trang live đầy đủ `/live/:id`
5. Tự động ngắt kết nối khi scroll ra khỏi tầm nhìn

## Các thay đổi

### 1. Tạo component mới: `src/components/feed/LiveVideoPreview.tsx`

Mini Agora viewer dùng cho feed:
- Sử dụng `useLiveRtc` hook (role: audience) để kết nối channel
- IntersectionObserver: chỉ `start()` khi visible, `leave()` khi hidden
- Hiển thị remote video trong container aspect-video
- Muted mặc định, có nút toggle mute
- Overlay: badge LIVE nhấp nháy, viewer count, "Nhấn để xem"

### 2. Cập nhật `src/components/feed/LivePostEmbed.tsx`

- Import và sử dụng `LiveVideoPreview` thay vì placeholder tĩnh
- Truyền `live_session_id` để preview kết nối đúng channel
- Giữ nguyên `onClick` navigate đến `/live/:id`
- Fallback: nếu chưa kết nối được hoặc chưa có video, vẫn hiển thị UI placeholder cũ

### 3. Giao diện mới trên bài post

```text
+-----------------------------------+
|  [LIVE]  [eye] 5 viewers          |
|                                   |
|   [  Live video stream here  ]    |
|                                   |
|   hostName dang phat truc tiep    |
|         Nhan de xem               |
+-----------------------------------+
```

- Video live hiển thị trực tiếp, chiếm toàn bộ vùng media
- Badge LIVE đỏ nhấp nháy ở góc trên trái
- Viewer count bên cạnh badge
- Text "Nhấn để xem" ở dưới để gợi ý click vào xem đầy đủ
- Khi chưa có video (host chưa publish), hiển thị loading/placeholder

## Chi tiết kỹ thuật

### File mới: `src/components/feed/LiveVideoPreview.tsx`
- Props: `sessionId`, `onReady` callback
- Hook: `useLiveRtc({ sessionId, role: 'audience', enabled: isVisible })`
- IntersectionObserver với threshold 0.5 để detect visibility
- `remoteContainerRef` gắn vào div để Agora render video
- Cleanup: `leave()` khi unmount hoặc invisible
- Không gọi `incrementLiveViewerCount` (chỉ preview, không tính viewer)

### File sửa: `src/components/feed/LivePostEmbed.tsx`
- Thêm state `isVideoReady` để biết khi nào Agora đã có remote video
- Render `LiveVideoPreview` với `sessionId={metadata.live_session_id}`
- Overlay gradient, LIVE badge, viewer count giữ nguyên trên video
- Khi `isVideoReady = false`, hiển thị placeholder cũ (loading spinner)
- Toàn bộ container vẫn clickable navigate đến `/live/:id`
