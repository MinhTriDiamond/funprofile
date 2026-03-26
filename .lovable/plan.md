

## Sửa 2 lỗi: Định dạng tuần + Rewards hiển thị 0

### Nguyên nhân gốc

**1. Rewards hiển thị 0 khi nhấp vào chi tiết:**
Hàm `get_content_users_by_period_vn` (rewards) bị lỗi SQL: `column reference "user_id" is ambiguous`. Cột trả về của hàm tên `user_id` xung đột với `f.user_id`, `p.user_id`, `po.user_id` trong CTE. Hàm crash im lặng → trả về 0 row.

**2. Tuần chỉ hiển thị ngày bắt đầu:**
`formatLabel` chỉ hiện "Tuần 23/03/2026" thay vì "23/03 → 29/03/2026".

### Thay đổi

**Migration SQL** — Sửa `get_content_users_by_period_vn`:
- Đổi tất cả `SELECT p.user_id`, `SELECT po.user_id`, `SELECT f.user_id`, `SELECT f.friend_id` trong CTE `user_rewards` thành alias `uid` để tránh xung đột với cột output `user_id`.

**File: `src/components/feed/ContentStatsModal.tsx`** — Sửa `formatLabel`:
- Mode `week`: Tính ngày kết thúc = ngày bắt đầu + 6 ngày, hiển thị "23/03 → 29/03/2026"

**File: `src/components/feed/ContentStatsDateDetail.tsx`** — Sửa `formatDateHeader`:
- Mode `week`: Tương tự, hiển thị khoảng ngày thay vì "Tuần dd/mm/yyyy"

### Kết quả
- Bấm vào tuần → hiển thị rõ "23/03 → 29/03/2026"
- Bấm vào rewards chi tiết → hiển thị danh sách user + số CAMLY phát sinh (không còn lỗi 0)

