

## Sửa lỗi: Tổng thành viên không khớp + Không nhấp được chi tiết tuần/tháng

### Nguyên nhân

**1. Tổng không khớp (783 vs 916)**
- Honor Board ngoài: `get_app_stats` đếm `profiles WHERE is_banned = false` → **783**
- Modal bên trong: `get_signups_grouped_vn` đếm **TẤT CẢ** profiles (kể cả banned) → **916**
- Giải pháp: Thêm `WHERE is_banned = false` vào `get_signups_grouped_vn` và `get_signups_by_date_vn`

**2. Nhấp vào tuần/tháng không hiện chi tiết**
- Code hiện tại chỉ cho phép nhấp khi `mode === 'day'` (dòng 74-78 trong NewMembersModal.tsx)
- `get_signups_by_date_vn` chỉ nhận 1 ngày, không hỗ trợ khoảng thời gian tuần/tháng
- Giải pháp: Tạo RPC mới `get_signups_by_range_vn` nhận `p_start_date` và `p_end_date`, rồi cho phép nhấp vào tuần/tháng

### Thay đổi

**1 migration SQL:**
- Cập nhật `get_signups_grouped_vn`: thêm `WHERE is_banned = false`
- Cập nhật `get_signups_by_date_vn`: thêm `AND p.is_banned = false`
- Tạo mới `get_signups_by_range_vn(p_start_date text, p_end_date text)`: trả danh sách user trong khoảng thời gian, `WHERE is_banned = false`

**2 file frontend:**
- `NewMembersModal.tsx`: Bỏ giới hạn `mode === 'day'` trong `handleRowClick`, tính `p_start_date`/`p_end_date` từ `period_label` theo mode (tuần = 7 ngày, tháng = đầu-cuối tháng), truyền range xuống detail component
- `NewMembersDateDetail.tsx`: Nhận thêm prop `endDate?`, nếu có thì gọi `get_signups_by_range_vn` thay vì `get_signups_by_date_vn`, cập nhật tiêu đề hiển thị phù hợp (VD: "Tuần 23/03/2026" hoặc "03/2026")

### Kết quả
- Tổng thành viên bên ngoài (783) = Tổng bên trong modal
- Nhấp vào bất kỳ hàng nào (ngày/tuần/tháng) đều hiển thị danh sách chi tiết thành viên

