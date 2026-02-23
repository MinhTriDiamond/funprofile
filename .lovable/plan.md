

# Multipart Upload cho Video Lớn

## Vấn đề hiện tại

Video được upload bằng 1 request PUT duy nhất. Với file lớn (hàng trăm MB đến 2GB), điều này gây ra:
- Upload chậm vì chỉ dùng 1 connection
- Nếu mất kết nối giữa chừng, phải upload lại từ đầu
- Timeout risk với file rất lớn

## Giải pháp: S3-compatible Multipart Upload

Cloudflare R2 hỗ trợ đầy đủ S3 Multipart Upload API. Cơ chế:
1. **Initiate** - Tạo multipart upload session trên R2
2. **Upload Parts** - Chia file thành nhiều phần (10MB mỗi phần), upload song song (3 parts cùng lúc)
3. **Complete** - Ghép tất cả parts thành 1 file hoàn chỉnh
4. **Abort** - Hủy nếu có lỗi (dọn dẹp parts đã upload)

### Ngưỡng kích hoạt

- File nho hon 50MB: dùng single PUT như hiện tại (nhanh, đơn giản)
- File lon hon hoac bang 50MB: dùng multipart upload (nhanh hơn, resume được)

## Chi tiết kỹ thuật

### 1. Edge Function mới: `multipart-upload`

File: `supabase/functions/multipart-upload/index.ts`

Xử lý 4 action qua 1 endpoint:
- `initiate` - Gọi R2 CreateMultipartUpload, trả về `uploadId`
- `get-part-urls` - Tạo presigned URLs cho từng part (batch)
- `complete` - Gọi R2 CompleteMultipartUpload với danh sách ETags
- `abort` - Gọi R2 AbortMultipartUpload để dọn dẹp

Tất cả action đều yêu cầu authentication. Dùng AWS Signature V4 để ký requests đến R2.

### 2. Client utility mới: `src/utils/multipartUpload.ts`

Logic phía client:
- Chia file thành chunks 10MB
- Lấy presigned URLs cho tất cả parts (batch request)
- Upload song song 3 parts cùng lúc bằng XHR (có progress tracking)
- Retry tự động mỗi part tối đa 3 lần khi lỗi
- Gọi complete khi tất cả parts xong
- Gọi abort nếu có lỗi không recover được
- Tính tổng progress từ tất cả parts

### 3. Cập nhật `src/utils/r2Upload.ts`

Thay đổi hàm `uploadToR2`:
- Nếu `file.size >= 50MB` -> gọi `multipartUploadToR2()` 
- Nếu `file.size < 50MB` -> giữ nguyên single presigned URL upload
- Truyền `onProgress` callback cho cả 2 trường hợp

### 4. Không thay đổi UI

`LiveHostPage.tsx` và `liveService.ts` không cần sửa vì progress callback đã có sẵn. Multipart upload tự động kích hoạt khi file đủ lớn.

## Ưu điểm

- Tốc độ nhanh hơn 2-3x nhờ upload song song
- Resume được: nếu 1 part lỗi, chỉ retry part đó
- Hỗ trợ file rất lớn (đến 2GB) ổn định hơn
- Backward compatible: file nhỏ vẫn dùng single upload
- Progress bar chính xác cho từng phần

