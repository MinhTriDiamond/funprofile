
# Sửa lỗi: Mở khóa / Đình chỉ user không cập nhật trạng thái

## Nguyên nhân

Trang `/users` gọi trực tiếp `supabase.from('profiles').update({ reward_status: '...' })` để thay đổi trạng thái user. Tuy nhiên, chính sách bảo mật (RLS) trên bảng `profiles` chỉ cho phép **người dùng tự cập nhật hồ sơ của chính mình**:

```
"Users can update their own profile" -> USING (auth.uid() = id)
```

Khi admin cố cập nhật hồ sơ của user khác, lệnh **không bị lỗi** nhưng **không cập nhật gì** (0 dòng bị ảnh hưởng). Đó là lý do toast "Thành công" hiện ra nhưng trạng thái không đổi.

## Giải pháp

Tạo thêm một chính sách RLS cho phép admin cập nhật hồ sơ người dùng khác:

1. **Thêm migration SQL** - Tạo policy mới:
   ```sql
   CREATE POLICY "Admins can update any profile"
     ON public.profiles FOR UPDATE
     USING (public.has_role(auth.uid(), 'admin'))
     WITH CHECK (public.has_role(auth.uid(), 'admin'));
   ```

2. **Cập nhật code `src/pages/Users.tsx`** - Thêm kiểm tra kết quả update: nếu không có dòng nào bị thay đổi, hiển thị lỗi thay vì thông báo thành công.

## Chi tiết kỹ thuật

### File thay đổi
- **Migration SQL mới**: Thêm RLS policy cho admin update profiles
- **`src/pages/Users.tsx`**: Cải thiện xử lý lỗi bằng cách kiểm tra `.select()` sau `.update()` để xác nhận thay đổi thực sự xảy ra
