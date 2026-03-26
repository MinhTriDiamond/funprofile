

## Sửa 2 vấn đề: Đồng bộ số liệu Rewards + Giới hạn chi tiết cho Admin

### Nguyên nhân số liệu lệch

So sánh 2 hàm SQL cho thấy **nhiều điểm khác biệt**:

| Điểm | `get_content_stats_grouped_vn` (tổng ngoài) | `get_content_users_by_period_vn` (chi tiết user) |
|------|----------------------------------------------|--------------------------------------------------|
| Livestream | Dùng bảng `livestreams` (cũ, sai) | Dùng `live_sessions` (đúng) |
| PPLP Mint | Không có | Có (`light_actions`) |
| `is_reward_eligible` | Không lọc | Có lọc |
| `is_banned` (signup bonus) | Không lọc | Có lọc |

Ngoài ra, `get_user_posts_by_period_vn` (chi tiết từng hoạt động) cũng dùng bảng `livestreams` cũ → không trả dữ liệu livestream.

### Thay đổi

#### 1. Migration SQL — Đồng bộ `get_content_stats_grouped_vn`
- Đổi `livestreams` → `live_sessions` (dùng `host_user_id`, `status = 'ended'`)
- Thêm lọc `is_banned = false` cho signup bonus
- Thêm lọc `is_reward_eligible` cho posts
- Thêm PPLP Mint rewards (`light_actions`)

#### 2. Migration SQL — Sửa `get_user_posts_by_period_vn` (rewards/livestream)
- Đổi `livestreams l WHERE l.user_id` → `live_sessions ls WHERE ls.host_user_id`
- Điều kiện: `ls.status = 'ended'` thay vì `l.is_eligible`

#### 3. Frontend — Chi tiết chỉ admin mới xem được
**File: `src/components/feed/ContentStatsDateDetail.tsx`**
- Import `useCapabilities`
- Chỉ cho phép click vào user row khi `isAdmin === true`
- User thường vẫn thấy danh sách user + số CAMLY, nhưng không click vào xem chi tiết từng hoạt động được

### Kết quả
- Tổng CAMLY bên ngoài = Tổng các user bên trong (đồng bộ)
- User thường chỉ xem tổng, admin mới drill-down chi tiết

