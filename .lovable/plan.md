
# Cập nhật thống kê Quản lý User: bao gồm cả user bị ban

## Vấn đề hiện tại
Trong trang Quản lý User (`/users`), mục "Tổng Users" chỉ đếm những user **chưa bị ban** (`is_banned = false`). Các số liệu khác (CAMLY, bài viết, bình luận...) đã tính đủ tất cả user rồi, chỉ riêng con số "Tổng Users" bị thiếu.

## Thay đổi cần thực hiện

### File: `src/hooks/useUserDirectory.ts`
- **Dòng 250**: Sửa `totalUsers` từ `allUsers.filter(u => !u.is_banned).length` thành `allUsers.length` để đếm tất cả user bao gồm cả user bị ban.

Chỉ cần thay đổi 1 dòng duy nhất. Tất cả dữ liệu chi tiết (CAMLY, posts, comments, donations...) đã được tính đầy đủ cho cả user bị ban lẫn user hoạt động.
