

## Kế hoạch: Thêm drill-down chi tiết user khi nhấp vào từng dòng trong ContentStatsModal

### Tổng quan
Khi nhấp vào một dòng (ngày/tuần/tháng) trong modal Tổng Bài Viết (và các mục khác), hiển thị danh sách user đã viết bài trong khoảng thời gian đó, kèm số bài viết của mỗi user. Nhấp vào user → đi đến trang cá nhân.

### Các bước

**1. Tạo RPC `get_content_users_by_period_vn`**
- Tham số: `p_type` (posts/photos/videos/livestreams/rewards), `p_date` (YYYY-MM-DD), `p_mode` (day/week/month)
- Trả về: `user_id`, `username`, `display_name`, `avatar_url`, `post_count`, `social_links`
- Logic: JOIN bảng tương ứng với `public_profiles`, nhóm theo user, đếm số bài, sắp xếp theo `post_count DESC`
- Xử lý khoảng thời gian: day = 1 ngày, week = 7 ngày từ ngày đó, month = cả tháng (theo VN timezone)

**2. Tạo component `ContentStatsDateDetail.tsx`**
- Tương tự `NewMembersDateDetail` nhưng hiển thị: avatar, tên, @username, social links, **số bài viết** (thay vì thời gian đăng ký)
- Props: `date`, `mode`, `type`
- Nhấp vào user → navigate đến profile
- Reuse pattern getPlatformLogo từ `NewMembersDateDetail`

**3. Cập nhật `ContentStatsModal.tsx`**
- Thêm state `selectedDate` (giống NewMembersModal)
- Mỗi dòng trong bảng trở thành clickable → set `selectedDate`
- Khi có `selectedDate`: hiển thị nút "Quay lại" + `ContentStatsDateDetail`
- Hỗ trợ drill-down cho tất cả mode (day/week/month), không chỉ day

### Chi tiết kỹ thuật
- Database: 1 migration tạo RPC `get_content_users_by_period_vn`
- Files tạo mới: `src/components/feed/ContentStatsDateDetail.tsx`
- Files sửa: `src/components/feed/ContentStatsModal.tsx`

