

## Sửa công thức "Tổng Phần Thưởng" — đang hiển thị nhầm dữ liệu "Đã Rút"

### Vấn đề
Modal "Tổng Phần Thưởng" khi bấm vào đang lấy dữ liệu từ bảng `reward_claims` (tiền đã rút). Đây chính là dữ liệu của "Tổng Đã Rút" — hoàn toàn trùng lặp và sai nghĩa.

Phần thưởng thực tế được tính từ hoạt động người dùng (bài đăng, cảm xúc, bình luận, chia sẻ, bạn bè, livestream) theo công thức trong `get_app_stats`.

### Giải pháp

**Tạo RPC mới: `get_reward_stats_grouped_vn`**

Viết hàm SQL mới tính tổng phần thưởng phát sinh theo ngày/tuần/tháng, dựa trên cùng logic của `get_app_stats`:
- **Giai đoạn 1** (trước 15/01/2026): Post 10.000, Reaction 1.000, Comment 2.000, Share 10.000, Friend 10.000
- **Giai đoạn 2** (từ 15/01/2026): Post 5.000 (max 10/ngày), Reaction 1.000 (max 50), Comment 1.000 (max 50), Share 1.000 (max 10), Friend 10.000 (max 10), Livestream 20.000 (max 5)
- Bonus đăng ký mới: 50.000/user (tính theo ngày tạo tài khoản)
- Group theo `day/week/month` timezone `Asia/Ho_Chi_Minh`

**Cập nhật `get_content_stats_grouped_vn`**

Thay case `p_type = 'rewards'` gọi sang RPC mới hoặc inline logic mới thay vì query `reward_claims`.

**Cập nhật `get_content_users_by_period_vn`**

Thay case `p_type = 'rewards'` để hiển thị chi tiết người dùng theo phần thưởng phát sinh (không phải đã rút).

### Kết quả
- "Tổng Phần Thưởng" hiển thị đúng tổng phần thưởng phát sinh từ hoạt động
- "Tổng Đã Rút" vẫn hiển thị tiền đã rút từ `reward_claims`
- Hai số liệu không còn trùng nhau

