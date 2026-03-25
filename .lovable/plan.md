

## Sửa lỗi: Lọc user bị ban khỏi danh sách chi tiết + Tạo RPC thiếu

### Tình trạng hiện tại
- **Tổng 783**: ✅ Đúng (đã trừ 133 user bị ban)
- **Danh sách chi tiết ngày**: ❌ Vẫn hiện user bị ban (hàm `get_signups_by_date_vn` chưa lọc `is_banned`)
- **Xem tuần/tháng**: ❌ Hàm `get_signups_by_range_vn` chưa tồn tại trong database

### Giải pháp — 1 migration SQL

**1. Cập nhật `get_signups_by_date_vn`**: Thêm `AND p.is_banned = false`

**2. Tạo `get_signups_by_range_vn`**: Hàm mới nhận `p_start_date` và `p_end_date`, trả danh sách user trong khoảng thời gian đó, có lọc `is_banned = false`

### Kết quả
- Danh sách chi tiết chỉ hiện user thực tế (không bị ban)
- Xem chi tiết tuần/tháng hoạt động bình thường
- Tổng ngoài = tổng trong = số user trong danh sách

