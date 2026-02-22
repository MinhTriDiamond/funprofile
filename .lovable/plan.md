

# Sua loi gui file .rar bi bao "File type not allowed"

## Nguyen nhan

Khi chon file `.rar`, trinh duyet co the gan MIME type khong nam trong danh sach cho phep cua he thong (vi du `application/x-rar` thay vi `application/x-rar-compressed` hoac `application/vnd.rar`). Ham `uploadMedia` trong `src/utils/mediaUpload.ts` hien chi xu ly truong hop MIME type rong (fallback ve `application/octet-stream`), nhung khong xu ly truong hop MIME type sai/khong chuan.

## Giai phap

Them bang anh xa (mapping) tu phan mo rong file sang MIME type chuan trong `mediaUpload.ts`. Khi MIME type cua file khong nam trong danh sach cho phep, he thong se tu dong tra cuu MIME type dung dua theo phan mo rong cua ten file.

## Chi tiet ky thuat

### File: `src/utils/mediaUpload.ts`

1. Them hang so `EXT_TO_MIME` anh xa phan mo rong file sang MIME type chuan:

```text
rar  -> application/x-rar-compressed
zip  -> application/zip
7z   -> application/x-7z-compressed
pdf  -> application/pdf
doc  -> application/msword
docx -> application/vnd.openxmlformats-officedocument.wordprocessingml.document
xls  -> application/vnd.ms-excel
xlsx -> application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
txt  -> text/plain
apk  -> application/vnd.android.package-archive
mp4  -> video/mp4
webm -> video/webm
mov  -> video/quicktime
```

2. Sua logic xu ly MIME type trong ham `uploadMedia` (khoang dong 83-88):
   - Lay phan mo rong tu `file.name`
   - Neu `file.type` rong hoac khong phai type chuan -> tra cuu `EXT_TO_MIME`
   - Tao `File` moi voi MIME type da normalize
   - Fallback cuoi cung van la `application/octet-stream`

### Khong can thay doi file khac

- Edge function `get-upload-url` da cho phep tat ca MIME type can thiet
- `ChatInput.tsx` da cho phep chon file `.rar` qua thuoc tinh `accept`

| File | Thay doi |
|------|---------|
| `src/utils/mediaUpload.ts` | Them `EXT_TO_MIME` mapping va normalize MIME type truoc khi upload |

