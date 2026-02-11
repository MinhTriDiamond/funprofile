

# Kế hoạch chuyển Video từ Cloudflare Stream sang Cloudflare R2

## Tổng quan

Chuyển toàn bộ hệ thống upload và phát video sang Cloudflare R2, bỏ Cloudflare Stream. Giới hạn video: **120 phút**, **2GB**.

## Phần 1: Thay đổi giới hạn

### File: `src/utils/imageCompression.ts`
- `VIDEO_MAX_SIZE`: 10GB -> **2GB** (2 * 1024 * 1024 * 1024)
- `VIDEO_MAX_DURATION`: 36000s (10 giờ) -> **7200s** (120 phút)

### File: `supabase/functions/get-upload-url/index.ts`
- `MAX_VIDEO_SIZE`: 10GB -> **2GB**

## Phần 2: Upload video mới lên R2 (thay Stream)

### File: `src/components/feed/VideoUploaderUppy.tsx` — Viết lại
- Bỏ toàn bộ logic gọi `stream-video` edge function
- Thay bằng gọi `get-upload-url` để lấy presigned URL cho R2
- Upload trực tiếp lên R2 qua `fetch PUT` (giống upload ảnh, nhưng có progress tracking qua XMLHttpRequest)
- Kết quả trả về: `{ url: "https://media.fun.rich/videos/...", key: "videos/..." }` thay vì `{ uid, url: "iframe.videodelivery.net/..." }`
- Giữ nguyên UI hiện có (progress bar, cancel, retry, thumbnail generation)
- Bỏ phần "processing" state (R2 không cần encode)
- Validate thời lượng video <= 120 phút trước khi upload (dùng `getVideoDuration` đã có)

### File: `src/utils/streamUpload.ts` — Giữ lại một phần
- Giữ: `isStreamUrl()`, `extractStreamUid()`, `formatBytes()`, `formatDuration()` (cần cho video cũ)
- Bỏ: `uploadToStream()`, `uploadToStreamTus()`, `getDirectUploadUrl()`, `getTusUploadUrl()`, `waitForVideoReady()`
- Giữ lại `checkVideoStatus()` tạm thời cho video cũ đang trên Stream

### File: `src/components/feed/CommentMediaUpload.tsx`
- Đã dùng `uploadToR2` — không cần thay đổi

## Phần 3: Phát video từ R2

### File: `src/components/ui/StreamPlayer.tsx`
- Hàm `parseVideoSource()` đã hỗ trợ `type: 'direct'` cho URL R2
- Cần thêm nhận dạng URL `media.fun.rich` vào nhánh `direct`
- Video R2 sẽ phát bằng thẻ `<video>` gốc (không cần HLS)

### File: `src/components/ui/LazyVideo.tsx`
- Hàm `isStreamUrl()` đã được dùng để quyết định render `StreamPlayer` hay `<video>` thông thường
- Video R2 mới sẽ tự động dùng thẻ `<video>` (vì không match `isStreamUrl`)

## Phần 4: Xóa video

### File: `src/utils/streamHelpers.ts`
- Giữ nguyên `deleteStreamVideoByUrl()`, `deleteStreamVideoByUid()` cho video cũ trên Stream
- Thêm logic: nếu URL là R2 (`media.fun.rich`) thì gọi `deleteFromR2()` thay vì `stream-video`

### File: `src/components/feed/EditPostDialog.tsx`
- Đã import cả `deleteFromR2` và `deleteStreamVideoByUid` — cần update logic phân biệt R2 vs Stream URL khi xóa

## Phần 5: Migration video cũ từ Stream sang R2

### Tạo edge function mới: `supabase/functions/migrate-stream-to-r2/index.ts`
- Dành cho admin chạy thủ công
- Quy trình cho mỗi video:
  1. Lấy danh sách video URL từ bảng `posts` (WHERE video_url LIKE '%videodelivery.net%')
  2. Trích UID từ URL
  3. Gọi Cloudflare Stream API lấy download URL gốc (`/downloads`)
  4. Download video từ Stream
  5. Upload lên R2 bucket `videos/`
  6. Cập nhật `video_url` trong bảng `posts`
  7. (Tùy chọn) Xóa video khỏi Stream
- Chạy theo batch (10 video/lần) để tránh timeout
- **151 video** cần migration

## Phần 6: Dọn dẹp (sau khi migration xong)

Các file/function có thể xóa sau khi không còn video trên Stream:
- `supabase/functions/stream-video/index.ts`
- `supabase/functions/cleanup-orphan-videos/index.ts`
- `supabase/functions/cleanup-stream-videos/index.ts`
- Các hàm Stream trong `src/utils/streamUpload.ts`

## Thứ tự thực hiện

1. Cập nhật giới hạn (FILE_LIMITS + edge function)
2. Viết lại VideoUploaderUppy để upload video mới lên R2
3. Cập nhật StreamPlayer nhận dạng URL R2
4. Cập nhật logic xóa video (R2 vs Stream)
5. Tạo edge function migration Stream -> R2
6. Chạy migration (admin thủ công)
7. Dọn dẹp code Stream (sau khi migration hoàn tất)

## Danh sách file thay đổi

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/utils/imageCompression.ts` | Sửa | VIDEO_MAX_SIZE=2GB, VIDEO_MAX_DURATION=7200 |
| `supabase/functions/get-upload-url/index.ts` | Sửa | MAX_VIDEO_SIZE=2GB |
| `src/components/feed/VideoUploaderUppy.tsx` | Viết lại | Upload qua R2 presigned URL thay Stream |
| `src/utils/streamUpload.ts` | Sửa | Bỏ hàm upload, giữ helper cho video cũ |
| `src/utils/streamHelpers.ts` | Sửa | Thêm logic xóa video R2 |
| `src/components/ui/StreamPlayer.tsx` | Sửa | Nhận dạng URL media.fun.rich |
| `src/components/feed/EditPostDialog.tsx` | Sửa | Phân biệt xóa R2 vs Stream |
| `supabase/functions/migrate-stream-to-r2/index.ts` | Tạo mới | Migration 151 video từ Stream sang R2 |

## Lưu ý kỹ thuật

- Video trên R2 phát ở chất lượng gốc (không adaptive bitrate). Với giới hạn 2GB/120 phút, chất lượng sẽ ổn cho hầu hết trường hợp.
- TUS resumable upload không cần thiết cho R2 (presigned URL + XMLHttpRequest đủ tracking progress). Nếu cần resumable cho file lớn, có thể dùng multipart upload sau.
- Video cũ trên Stream vẫn phát được bình thường cho đến khi migration xong.

