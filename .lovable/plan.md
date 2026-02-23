
# Sửa Lỗi "Profile not found" Khi Bấm Tên Trong Chat

## Nguyên nhân gốc

Trang Profile có logic tự động chuyển hướng (redirect) tại dòng 185-187 trong `src/pages/Profile.tsx`:

```
if (userId && data?.username) {
  navigate(`/${data.username}`, { replace: true });
}
```

Khi bấm vào tên "LƯU THỊ LIÊN" trong chat, trình duyệt điều hướng đến `/profile/2ef75f48-...` (đúng). Tuy nhiên, trang Profile tải xong hồ sơ thành công rồi lại **tự chuyển hướng** sang `/{username}`. Username của người dùng này là `"Angel  Liên Liên "` (có 2 dấu cách liên tiếp và dấu cách ở cuối), khiến URL bị lỗi. Khi route `/:username` nhận URL này, nó tìm kiếm lại bằng username nhưng không khớp chính xác do vấn đề mã hóa URL (URL encoding) với ký tự đặc biệt và dấu cách.

## Giải pháp

Sửa **2 vấn đề**:

### 1. Mã hóa username khi chuyển hướng (ngắn hạn)
Trong `src/pages/Profile.tsx` dòng 186, thay:
```
navigate(`/${data.username}`, { replace: true });
```
Thành:
```
navigate(`/@${encodeURIComponent(data.username.trim())}`, { replace: true });
```
Thêm `encodeURIComponent` để xử lý ký tự đặc biệt, `.trim()` để loại bỏ khoảng trắng thừa, và tiền tố `@` để dùng route `/@:username` (rõ ràng hơn).

### 2. Xử lý decode username khi tìm kiếm
Tại dòng 90, thêm `decodeURIComponent` khi xử lý username từ URL:
```
const cleanUsername = decodeURIComponent(
  username.startsWith('@') ? username.slice(1) : username
).trim();
```

## Chi tiết kỹ thuật

- File cần sửa: `src/pages/Profile.tsx`
- Dòng 90: Thêm `decodeURIComponent` + `.trim()` cho username
- Dòng 186: Thêm `encodeURIComponent` + `.trim()` + tiền tố `@` cho redirect URL
- Chỉ sửa 1 file, 2 dòng
