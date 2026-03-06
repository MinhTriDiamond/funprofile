

# Thêm cột Gmail và tổng CAMLY đã rút vào ClaimHistoryModal

## Thay đổi

### 1. Cập nhật `ClaimHistoryModal.tsx`
- **Thêm cột Email**: Gọi RPC `get_user_emails_for_admin` (đã có sẵn) để lấy email cho admin. User thường không thấy cột này.
- **Kiểm tra admin**: Dùng `useCurrentUser` + query `user_roles` để xác định quyền admin (giống pattern trong `useUserDirectory.ts`).
- **Hiển thị tổng CAMLY đã rút**: Tính `SUM(amount)` từ danh sách `filtered` và hiển thị ở footer bảng, kèm logo CAMLY.
- **Tìm kiếm theo email**: Nếu là admin, cho phép search cả email.

### 2. Chi tiết UI
- Thêm cột "Email" (ẩn trên mobile, chỉ hiện cho admin) giữa cột Username và Tên
- Footer hiển thị: `274 bản ghi | Tổng: 98.238.999 CAMLY`
- Email được truncate nếu quá dài

### 3. Không cần thay đổi database
- RPC `get_user_emails_for_admin` đã tồn tại và hoạt động

