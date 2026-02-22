

# Thêm cột Email và chức năng Xóa tài khoản trong Quản lý User

## Mục tiêu
1. Hiển thị email (Gmail) của user trong tất cả các mục quản lý user
2. Thêm nút xóa tài khoản cho admin khi user yêu cầu xóa do đăng ký nhầm

## Vấn đề kỹ thuật
- Email nằm trong bảng `auth.users` (không thể truy vấn trực tiếp từ client)
- Cần tạo database function với `SECURITY DEFINER` để admin lấy được email
- Đã có edge function `delete-user-account` nhưng chỉ cho user tự xóa (yêu cầu JWT của chính user đó). Cần tạo thêm edge function cho admin xóa bất kỳ user nào

## Kế hoạch thực hiện

### Buoc 1: Tạo database function lấy email từ auth.users
Tạo hàm `get_user_emails_for_admin(p_admin_id UUID)` trả về danh sách `(user_id, email)` cho tất cả user. Hàm kiểm tra quyền admin trước khi trả kết quả.

### Buoc 2: Tạo edge function `admin-delete-user`
Tạo edge function mới cho phép admin xóa hoàn toàn tài khoản user (bao gồm tất cả dữ liệu liên quan + auth.users). Edge function sẽ:
- Xác minh admin qua JWT + kiểm tra role admin
- Nhận `user_id` cần xóa
- Xóa tuần tự dữ liệu trên 15+ bảng liên quan (giống `delete-user-account` hiện có)
- Xóa user khỏi `auth.users`

### Buoc 3: Cập nhật `useAdminUsers.ts`
- Thêm field `email` vào interface `AdminUserData`
- Gọi thêm hàm `get_user_emails_for_admin` trong `fetchAdminUsers`
- Map email vào từng user

### Buoc 4: Cập nhật `UserReviewTab.tsx`
- Hiển thị email bên cạnh username trong mỗi UserCard
- Cắt ngắn email nếu quá dài

### Buoc 5: Cập nhật `QuickDeleteTab.tsx`
- Hiển thị email trong UserCard
- Thêm tìm kiếm theo email
- Thêm nút "Xóa tài khoản" (bên cạnh nút "Cấm vĩnh viễn")
- Thêm dialog xác nhận xóa tài khoản với cảnh báo rõ ràng (hành động không thể hoàn tác)
- Gọi edge function `admin-delete-user` khi xác nhận

## Chi tiết kỹ thuật

### Database function
```sql
CREATE FUNCTION get_user_emails_for_admin(p_admin_id UUID)
RETURNS TABLE(user_id UUID, email TEXT)
-- Chỉ admin mới gọi được
-- Truy vấn auth.users để lấy email
```

### Edge function `admin-delete-user`
- Method: POST
- Body: `{ "user_id": "uuid-to-delete" }`
- Auth: JWT của admin + kiểm tra `has_role(admin_id, 'admin')`
- Xóa dữ liệu tuần tự trên tất cả bảng liên quan rồi xóa auth.users

### UI thay đổi
- UserCard hiển thị thêm dòng email (icon Mail + text nhỏ)
- QuickDeleteTab: thêm nút "Xóa vĩnh viễn" màu đỏ đậm với dialog xác nhận 2 bước
- Tìm kiếm hỗ trợ thêm email

