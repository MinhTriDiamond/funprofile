

# Sửa lỗi: Video replay không hiển thị trên Feed sau live chunked recording

## Phân tích hiện trạng

### Chunked recording ĐANG HOẠT ĐỘNG tốt ở backend:
- Recording `7f88da85`: **done** — 5 chunks, manifest tạo thành công, post đã cập nhật
- Recording `0901b642`: **done** — 483 chunks, manifest tạo thành công, post đã cập nhật
- 2 recordings khác (`1cbca5f4`, `7ba68bd7`) đang stuck ở status `recording` (user rời trang mà không bấm End Live)

### Nguyên nhân gốc: Feed không biết phát manifest.json

Khi `recording-finalize` chạy xong, nó cập nhật post với:
```
video_url = "https://.../manifest.json"
metadata.playback_type = "chunked_manifest"
```

Nhưng trong feed (`FacebookPostCard.tsx` → `MediaGrid` → `LazyVideo`), URL `manifest.json` được truyền thẳng vào `<video src="...manifest.json">`. Trình duyệt không thể phát JSON file → `onError` → `hasError=true` → component return `null` → **video biến mất hoàn toàn**, chỉ còn bài post text "Dang LIVE tren FUN Profile".

Đây chính là lỗi trong screenshot: post hiển thị nhưng **không có video player**.

## Giải pháp

### 1. Tích hợp `ChunkedVideoPlayer` vào `LazyVideo.tsx`

Thêm detection cho manifest URL và dùng `ChunkedVideoPlayer` (đã tạo sẵn) thay vì `<video>` tag:

- Detect: URL kết thúc bằng `manifest.json` hoặc chứa `/recordings/` + `/manifest`
- Lazy load `ChunkedVideoPlayer` component
- Khi phát hiện manifest URL → render `ChunkedVideoPlayer` thay vì native video

### 2. Fallback trong `FacebookPostCard.tsx`

Kiểm tra `metadata.playback_type === 'chunked_manifest'` để đánh dấu media item đúng loại, truyền flag xuống `MediaGrid` → `LazyVideo`.

### 3. Xử lý recordings stuck

Hai recordings đang stuck ở status `recording` sẽ không tự finalize. Cần thêm logic để:
- Khi user rời trang (unmount/beforeunload), gọi `stop()` trước khi destroy
- Cho cleanup edge function xử lý recordings stuck > 2 giờ

## Danh sách file cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/ui/LazyVideo.tsx` | Detect manifest.json URL → lazy load ChunkedVideoPlayer |
| `src/components/feed/FacebookPostCard.tsx` | Truyền `isChunkedManifest` flag khi metadata có `playback_type: chunked_manifest` |
| `src/components/feed/MediaGrid.tsx` | Thêm prop `isChunkedManifest` vào MediaItem, truyền xuống LazyVideo |
| `src/modules/live/components/ChunkedVideoPlayer.tsx` | Đảm bảo export đúng, thêm error handling cho fetch manifest |

