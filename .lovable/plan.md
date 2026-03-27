

## Giới hạn "Tổng Phần Thưởng" chỉ dành cho Admin

### Phân tích
Hiện tại khi click vào mục "Tổng Phần Thưởng" trên Honor Board, **tất cả user** đều thấy:
- Danh sách ngày + số CAMLY
- Click vào ngày → danh sách user + số CAMLY từng người
- Admin click vào user → chi tiết từng hoạt động

User yêu cầu: **chỉ admin mới được xem** thông tin chi tiết trong modal này.

### Thay đổi

#### File: `src/components/feed/AppHonorBoard.tsx`
- Import `useCapabilities`
- Khi user click vào card "Tổng Phần Thưởng" (`rewards`), kiểm tra `isAdmin`:
  - **Admin**: mở modal `ContentStatsModal` bình thường
  - **User thường**: không mở modal, hoặc hiển thị toast thông báo "Chỉ quản trị viên mới xem được chi tiết này"

Cụ thể: trong hàm xử lý click card, thêm điều kiện nếu `type === 'rewards' && !isAdmin` thì chặn và show toast.

### Kết quả
- User thường vẫn thấy tổng số CAMLY trên Honor Board (card bên ngoài)
- Nhưng không thể click vào xem chi tiết bên trong
- Chỉ admin mới mở được modal "Tổng Phần Thưởng"

