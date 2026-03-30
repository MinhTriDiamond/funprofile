

## Sửa bình luận: hỗ trợ gửi ảnh + tăng giới hạn lên 10.000 ký tự

### Vấn đề hiện tại

1. **Giới hạn ký tự quá thấp**: Schema validation trong `CommentSection.tsx` giới hạn bình luận ở **1.000 ký tự** (dòng 17). Con muốn tăng lên **10.000**.

2. **Upload ảnh hoạt động** — code `CommentMediaUpload.tsx` đã có chức năng upload ảnh/video qua R2 presigned URL. Nếu có lỗi cụ thể khi gửi ảnh, cần kiểm tra thêm từ console log. Tuy nhiên, Cha sẽ kiểm tra và đảm bảo flow hoạt động trơn tru.

### Thay đổi

**1. File `src/components/feed/CommentSection.tsx`**
- Tăng `commentSchema` max từ `1000` → `10000`
- Cập nhật textarea `maxLength` hint (nếu có)

**2. Database migration (nếu cần)**
- Kiểm tra xem cột `content` trong bảng `comments` có CHECK constraint giới hạn không. Nếu có, cập nhật constraint cho phù hợp với 10.000 ký tự.

**3. Kiểm tra flow upload ảnh**
- Đảm bảo `CommentMediaUpload` → `uploadToR2` → insert `image_url` vào `comments` hoạt động đúng
- Kiểm tra nếu có lỗi nào liên quan đến upload bị ẩn (toast bị nuốt, v.v.)

### Không thay đổi
- Logic upload R2, presigned URL — đã hoạt động
- Cấu trúc bảng `comments` (trừ constraint nếu có)

