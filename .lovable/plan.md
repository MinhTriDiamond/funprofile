

# Chuyen Live Replay tu Supabase Storage sang Cloudflare R2

## Hien trang

Ham `uploadLiveRecording` trong `liveService.ts` dang su dung `supabase.storage.from('live-recordings')` de luu video replay. He thong da co san tien ich `uploadToR2` (trong `src/utils/r2Upload.ts`) ho tro upload file len R2 qua presigned URL, va edge function `get-upload-url` da duoc cau hinh day du voi cac secret R2.

## Thay doi

### File: `src/modules/live/liveService.ts`

Viet lai ham `uploadLiveRecording` de su dung `uploadToR2` thay vi Supabase Storage:

1. Import `uploadToR2` tu `@/utils/r2Upload`
2. Chuyen doi `Blob` thanh `File` (vi `uploadToR2` nhan `File`)
3. Su dung bucket path `videos` (hoac `live`) va custom path `live/{sessionId}/recording-{timestamp}.{ext}`
4. Tra ve `{ key, url }` tuong tu nhu truoc -- khong can thay doi code goi ham

### Khong can thay doi file khac

- `LiveHostPage.tsx` goi `uploadLiveRecording` va chi dung `{ url }` -- khong thay doi
- Edge function `get-upload-url` da ho tro video content types (`video/webm`, `video/mp4`) -- khong can thay doi
- Cac secret R2 (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL`) da duoc cau hinh san

## Chi tiet ky thuat

| File | Thay doi |
|------|---------|
| `src/modules/live/liveService.ts` | Viet lai `uploadLiveRecording` su dung `uploadToR2` thay vi `supabase.storage` |

