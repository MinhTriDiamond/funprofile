

# An muc Li xi va fix tinh nang Dinh kem file

## Van de 1: An muc Li xi
Muc "Li xi" hien thi trong menu dinh kem. Can an di vi chua su dung.

## Van de 2: Dinh kem file chi ho tro anh/video
Edge function `get-upload-url` chi cho phep upload **anh va video**. Cac loai file khac (PDF, ZIP, RAR, DOC...) se bi tu choi voi loi "File type not allowed".

Danh sach content types hien tai chi co:
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/avif`, `image/heic`
- `video/mp4`, `video/webm`, `video/quicktime`, `video/x-m4v`

**Thieu hoan toan:** PDF, Word, Excel, ZIP, RAR, APK, TXT...

## Ke hoach sua

### Buoc 1: An muc "Li xi" trong `ChatInput.tsx`
Xoa hoac comment block code cua nut "Li xi" (dong 280-287).

### Buoc 2: Mo rong ALLOWED_CONTENT_TYPES trong edge function `get-upload-url`
Them cac content types cho file tai lieu va nen:
- `application/pdf`
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/zip`, `application/x-rar-compressed`, `application/x-7z-compressed`
- `application/vnd.android.package-archive` (APK)
- `text/plain`
- `application/octet-stream` (fallback cho file khong xac dinh MIME)

### Buoc 3: Xu ly truong hop file khong co MIME type
Trong `uploadCommentMedia` (file `mediaUpload.ts`), khi file khong phai anh, ham goi `uploadMedia` voi `compress: false`. Tuy nhien, neu file co MIME rong hoac khong xac dinh, can dat fallback la `application/octet-stream`.

## Chi tiet ky thuat

| File | Thay doi |
|------|---------|
| `src/modules/chat/components/ChatInput.tsx` | Xoa block nut "Li xi" (dong 280-287) |
| `supabase/functions/get-upload-url/index.ts` | Them content types cho documents, archives |
| `src/utils/mediaUpload.ts` | Them fallback MIME type cho file khong xac dinh |

