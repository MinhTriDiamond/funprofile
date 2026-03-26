

## Sửa lỗi "Tổng Phần Thưởng" hiển thị 0 CAMLY và chi tiết không có dữ liệu

### Nguyên nhân

**2 lỗi cùng lúc:**

1. **`get_content_stats_grouped_vn` (rewards)**: Dòng tổng hợp ngày bị lệch do chuyển đổi timezone kép. `rday` đã là ngày VN (date), nhưng lại bị `rday::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'` chuyển ngược về UTC → sai ngày, dẫn đến hiển thị 0.

2. **`get_user_posts_by_period_vn` (rewards)**: Vẫn đang query bảng `reward_claims` (tiền đã rút) thay vì hoạt động phát sinh thưởng. Đây là lý do khi nhấp chi tiết user → "Không có dữ liệu" (vì ngày đó không có ai rút tiền).

### Thay đổi

**Migration SQL mới** — sửa 2 hàm:

#### 1. Sửa `get_content_stats_grouped_vn` (rewards)
- Thay dòng GROUP BY từ `date_trunc(v_trunc, rday::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')` thành logic đúng:
  - Day mode: `to_char(rday, 'YYYY-MM-DD')`
  - Week/Month mode: sử dụng `date_trunc(v_trunc, rday)` trực tiếp (rday đã là VN date)

#### 2. Sửa `get_user_posts_by_period_vn` (rewards)
- Thay toàn bộ case `rewards` từ query `reward_claims` sang query các bảng hoạt động thực tế (posts, reactions, comments, shared_posts, friendships, livestreams)
- Mỗi hoạt động trả về 1 row với `content` mô tả loại thưởng + số tiền (VD: "📝 Đăng bài: +5,000 CAMLY")
- Áp dụng đúng hệ số giai đoạn 1/2 và daily caps tương tự 2 hàm đã sửa

### Kết quả
- Bấm vào "Tổng Phần Thưởng" → hiển thị đúng số CAMLY phát sinh theo ngày
- Bấm vào user → hiển thị danh sách chi tiết các hoạt động đã tạo thưởng

