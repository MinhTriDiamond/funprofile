

# Phân tích: Chunked Recording hoạt động tốt, nhưng có 2 lỗi hiển thị trên Feed

## Backend: HOẠT ĐỘNG ĐÚNG

| Recording | Status | Chunks | Manifest |
|-----------|--------|--------|----------|
| `74c1fe30` | done | 3 | Accessible, 12s video |
| `7f88da85` | done | 5 | Accessible |
| `0901b642` | done | 483 | Accessible, ~32 phút video |

Posts đã được tạo đúng với `video_url` trỏ đến `manifest.json` và `metadata.playback_type = "chunked_manifest"`.

Manifest fetch thành công, 3 chunks có URL hợp lệ trên R2.

## 2 lỗi còn lại cần sửa

### Lỗi 1: ChunkedVideoPlayer bị ẩn do opacity-0

Trong `LazyVideo.tsx`, `ChunkedVideoPlayer` được wrap với class `isLoaded ? 'opacity-100' : 'opacity-0'`. Nhưng `ChunkedVideoPlayer` **không gọi callback** để set `isLoaded = true`. Kết quả: player tải xong video nhưng vẫn bị `opacity-0` (vô hình).

Timeout 3 giây có thể cứu, nhưng nếu video load nhanh hơn hoặc chậm hơn, UX không tốt.

**Sửa**: Thêm `onReady` và `onError` callbacks vào `ChunkedVideoPlayer`, gọi chúng từ `LazyVideo`.

### Lỗi 2: MediaGalleryViewer dùng raw `<video>` tag

Khi user click vào video trong feed để mở gallery fullscreen, `MediaGalleryViewer` (trong `MediaGrid.tsx` dòng 393) render:
```tsx
<video src={currentMedia.url} controls autoPlay />
```
Với manifest URL, trình duyệt cố phát JSON → lỗi.

**Sửa**: Detect manifest URL trong gallery viewer → render `ChunkedVideoPlayer` thay vì `<video>`.

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/modules/live/components/ChunkedVideoPlayer.tsx` | Thêm `onReady` và `onError` callback props |
| `src/components/ui/LazyVideo.tsx` | Truyền `handleStreamReady`/`handleStreamError` vào `ChunkedVideoPlayer` để cập nhật `isLoaded` |
| `src/components/feed/MediaGrid.tsx` | Detect manifest URL trong `MediaGalleryViewer` → dùng `ChunkedVideoPlayer` thay vì raw `<video>` |

