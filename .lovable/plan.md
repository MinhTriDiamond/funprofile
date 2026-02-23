

# Nén Video Replay Livestream Trước Khi Upload

## Tình trạng hiện tại

Video replay livestream được ghi bằng `MediaRecorder` (định dạng webm) và upload thẳng lên Cloudflare R2 mà **không qua bước nén nào**. Hệ thống chỉ có nén ảnh (`compressImage` trong `src/utils/imageCompression.ts`), chưa có nén video.

## Giải pháp: Nén video bằng WebCodecs API (trình duyệt)

Sử dụng **Canvas + WebCodecs API** để re-encode video ngay trên trình duyệt trước khi upload. Cách này không cần server xử lý, không cần thư viện ngoài (như FFmpeg.wasm nặng ~25MB).

### Cơ chế hoạt động

1. Khi host kết thúc live, blob video webm được tạo ra
2. **Bước mới**: Decode video blob -> giảm resolution (nếu cần) -> re-encode với bitrate thấp hơn -> tạo blob mới nhỏ hơn
3. Upload blob đã nén lên R2

### Thông số nén

- **Resolution tối đa**: 720p (1280x720) - đủ chất lượng cho replay
- **Video bitrate**: ~1.5 Mbps (thay vì bitrate gốc thường 3-5 Mbps từ MediaRecorder)
- **Audio bitrate**: 128 kbps
- **Ước tính giảm**: 40-60% dung lượng file

### Fallback

WebCodecs API chưa được hỗ trợ trên tất cả trình duyệt (Safari cũ, Firefox cũ). Nếu không hỗ trợ, sẽ **bỏ qua bước nén** và upload video gốc như hiện tại.

## Chi tiết kỹ thuật

### File mới: `src/utils/videoCompression.ts`

Tạo utility function `compressVideo(blob, options)`:
- Dùng `VideoDecoder` + `VideoEncoder` (WebCodecs API) để re-encode
- Giảm resolution xuống 720p nếu video lớn hơn
- Giảm bitrate xuống 1.5 Mbps
- Callback `onProgress` để hiển thị tiến trình nén
- Trả về blob đã nén hoặc blob gốc nếu WebCodecs không hỗ trợ

### File sửa: `src/modules/live/liveService.ts`

Cập nhật function `uploadLiveRecording`:
- Import `compressVideo` 
- Gọi `compressVideo(blob)` trước khi upload
- Truyền `onProgress` để cập nhật UI

### File sửa: `src/modules/live/pages/LiveHostPage.tsx`

Cập nhật `handleEndLive`:
- Thêm trạng thái "Đang nén video..." giữa bước ghi xong và upload
- Hiển thị progress nén riêng biệt với progress upload

### File sửa: `src/modules/live/liveService.ts` (RecordingStatus)

Thêm trạng thái `'compressing'` vào `RecordingStatus` type để UI hiển thị đúng.

