
# Sửa Lỗi Bộ Lọc "Đình Chỉ" Trong Danh Sách Thành Viên

## Vấn Đề

Khi chọn trạng thái "Đình chỉ" trong bộ lọc, danh sách trống vì:
- Kiểu dữ liệu `Filters.status` chỉ có `'all' | 'active' | 'banned'`, thiếu `'suspended'`
- Logic lọc (dòng 215-216) không có case xử lý cho `suspended`
- Dữ liệu `reward_status` đã có sẵn từ database nhưng chưa được dùng để lọc

## Giải Pháp

### File: `src/hooks/useUserDirectory.ts`

1. Cập nhật kiểu `Filters.status` thêm `'suspended'`:
   ```
   status: 'all' | 'active' | 'suspended' | 'banned'
   ```

2. Thêm logic lọc cho `suspended` (sau dòng 216):
   ```
   else if (filters.status === 'suspended') result = result.filter(u => u.reward_status === 'on_hold');
   ```

3. Cập nhật filter `active` để loại trừ cả user bị đình chỉ:
   ```
   if (filters.status === 'active') result = result.filter(u => !u.is_banned && u.reward_status !== 'on_hold');
   ```

Chỉ cần sửa 1 file duy nhất, thay doi nho.
