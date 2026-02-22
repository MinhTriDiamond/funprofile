

# Hien thi ten file goc khi dinh kem trong chat

## Van de hien tai

Khi nguoi dung dinh kem file (VD: `BaoGia_2025.rar`), ham `generateCacheBustFilename` doi ten thanh `userId_timestamp_hash.rar`. Ten file hien thi trong chat va khi tai ve deu la ten he thong, khong phai ten goc.

## Giai phap

Thay doi cach dat ten file upload: giu nguyen ten goc trong duong dan R2, chi them prefix hash de tranh trung lap.

**Format moi:** `bucket/userId_timestamp_hash/originalFilename.ext`

VD: `comment-media/abc123_1708000000_x7k2m9/BaoGia_2025.rar`

Nhu vay, ham `getFileName(url)` se tu dong trich xuat dung ten goc tu URL.

## Chi tiet ky thuat

### 1. Sua `generateCacheBustFilename` trong `src/utils/mediaUpload.ts`

Tach thanh 2 phan:
- **Anh/Video**: giu nguyen cach cu (doi ten hoan toan) vi khong can hien thi ten file
- **File tai lieu**: tra ve dang `hash_folder/originalName` de giu ten goc

Tao them ham `generateDocumentPath(originalName, userId)` tra ve: `userId_timestamp_hash/tenfile_goc.ext`

### 2. Sua `uploadCommentMedia` trong `src/utils/mediaUpload.ts`

Voi file khong phai anh/video: su dung `generateDocumentPath` thay vi `generateCacheBustFilename` de key trong R2 chua ten file goc.

### 3. Sua `FileAttachment.tsx` - download dung ten goc

Thay vi `window.open(url)`, su dung fetch + blob + download link de nguoi dung tai ve voi dung ten file goc (lay tu URL path).

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/utils/mediaUpload.ts` | Them ham `generateDocumentPath`, sua `uploadMedia` de nhan biet file tai lieu va giu ten goc trong key |
| `src/modules/chat/components/FileAttachment.tsx` | Sua nut download de tai file ve voi ten goc thay vi mo tab moi |

## Luu y

- Anh va video van giu ten he thong nhu cu (khong anh huong)
- Cac file da gui truoc do khong anh huong (van hoat dong binh thuong, chi ten hien thi la ten he thong)
- Ten file goc duoc lam sach (bo ky tu dac biet) de dam bao tuong thich URL

