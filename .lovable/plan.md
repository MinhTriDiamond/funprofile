

# Hiển thị video trong Link Preview Card

## Vấn đề
Hiện tại edge function đã scrape `og:video` từ các link (bao gồm Facebook video), và hook `useLinkPreview` đã lưu trường `video` trong data. Tuy nhiên, `LinkPreviewCard` chỉ render ảnh tĩnh (`data.image`) mà **bỏ qua hoàn toàn** `data.video`.

## Giải pháp

### File: `src/components/feed/LinkPreviewCard.tsx`

Thêm logic hiển thị video khi `data.video` tồn tại:

1. **Phát hiện loại video URL**:
   - Facebook `og:video` thường trả về URL dạng embed (`https://www.facebook.com/video/embed?video_id=...`) hoặc URL trực tiếp MP4
   - YouTube trả về embed URL (`https://www.youtube.com/embed/...`)
   - Các trang khác có thể trả về direct MP4/WebM

2. **Render video**:
   - Nếu video URL là embed URL (chứa `facebook.com/video/embed`, `youtube.com/embed`, `player.vimeo.com`) → render `<iframe>` với aspect ratio 16:9
   - Nếu video URL là direct file (`.mp4`, `.webm`, `.ogg` hoặc URL không phải embed) → render `<video>` tag với controls
   - Video hiển thị **thay thế** ảnh tĩnh (ưu tiên video > image)

3. **Thay đổi wrapper**: Khi có video, chuyển wrapper từ `<a>` thành `<div>` để tránh conflict giữa click link và play video. Thêm link nhỏ bên dưới metadata để mở trang gốc.

4. **Fallback**: Nếu video không load được (iframe error hoặc video error), fallback về hiển thị ảnh tĩnh như hiện tại.

### Chi tiết kỹ thuật

```text
┌─────────────────────────────┐
│  [Video player / iframe]    │  ← og:video (ưu tiên)
│  aspect-ratio 16:9          │     hoặc og:image (fallback)
├─────────────────────────────┤
│  FACEBOOK.COM               │
│  Title of the post...       │
│  Description...             │
└─────────────────────────────┘
```

Tổng: sửa **1 file** (`LinkPreviewCard.tsx`), không cần thay đổi edge function hay hook.

