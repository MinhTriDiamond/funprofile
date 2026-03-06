

## Kế hoạch: Trừ user bị ban khỏi Tổng Thành Viên trong Bảng Danh Dự

### Vấn đề
Hiện tại dòng 21 trong hàm `get_app_stats` đếm tất cả profiles:
```sql
SELECT COUNT(*) INTO v_total_users FROM profiles;
```
Không loại trừ user bị ban (`is_banned = true`), dẫn đến số liệu "Tổng Thành Viên" trên Bảng Danh Dự bao gồm cả tài khoản đã bị cấm.

### Thay đổi
Tạo migration SQL mới cập nhật hàm `get_app_stats`, chỉ sửa **một dòng duy nhất**:

```sql
-- Dòng 21: thêm điều kiện lọc user bị ban
SELECT COUNT(*) INTO v_total_users FROM profiles WHERE is_banned = false;
```

Toàn bộ logic tính thưởng (`v_total_rewards`, `v_claimed`, `v_treasury`) và các số liệu khác (bài viết, ảnh, video, livestream) giữ nguyên không thay đổi để phục vụ kiểm toán.

