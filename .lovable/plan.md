

# Sửa lỗi Live Replay không phát được video

## Nguyên nhân gốc

Manifest và tất cả chunk URLs đang trỏ tới domain `pub-e83e74b0726742fbb6a60bc08f95624b.r2.dev` (R2 dev URL). Domain này **không có CORS headers** nên trình duyệt chặn `fetch()` khi `ChunkedVideoPlayer` cố tải chunks. Video hiện duration (0:36) nhưng không bao giờ phát được.

Nguyên nhân sâu: secret `CLOUDFLARE_R2_PUBLIC_URL` đang set giá trị `https://pub-e83e74b0726742fbb6a60bc08f95624b.r2.dev` thay vì `https://media.fun.rich` (custom domain đã có CORS đúng).

## Giải pháp (3 bước)

### 1. Thêm URL normalizer trong ChunkedVideoPlayer

Thêm function rewrite URL từ `pub-*.r2.dev` → `media.fun.rich` trước khi fetch manifest và chunks.

**File**: `src/modules/live/components/ChunkedVideoPlayer.tsx`

```typescript
const R2_DEV_PATTERN = /https:\/\/pub-[a-f0-9]+\.r2\.dev/g;
const R2_CUSTOM_DOMAIN = 'https://media.fun.rich';

function normalizeR2Url(url: string): string {
  return url.replace(R2_DEV_PATTERN, R2_CUSTOM_DOMAIN);
}
```

Áp dụng `normalizeR2Url()` tại:
- `start()` khi fetch manifest URL (dòng 544)
- Mỗi chunk URL trong manifest sau khi parse (normalize toàn bộ `manifest.chunks[].url`)

Điều này sửa **tất cả bản ghi hiện tại** mà không cần cập nhật database.

### 2. Cập nhật secret `CLOUDFLARE_R2_PUBLIC_URL`

Yêu cầu cập nhật secret thành `https://media.fun.rich` để tất cả recording mới sử dụng custom domain đúng. Điều này ảnh hưởng:
- `r2-signed-chunk-url` Edge Function (trả `publicUrl`)
- `recording-finalize` Edge Function (build manifest chunk URLs)

### 3. Thêm URL normalizer vào FeedVideoPlayer

**File**: `src/components/feed/FeedVideoPlayer.tsx`

Normalize `src` prop trước khi truyền xuống `ChunkedVideoPlayer` hoặc `FacebookVideoPlayer`, đảm bảo mọi video URL legacy đều được chuyển đổi.

## Tác động

- Tất cả live replay cũ (dùng `r2.dev` URL) sẽ tự động phát được
- Recording mới sẽ sử dụng `media.fun.rich` domain
- Không cần migration database

