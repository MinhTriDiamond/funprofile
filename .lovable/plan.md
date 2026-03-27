

## Sửa lỗi sai lệch số liệu Total Rewards giữa bên ngoài và modal chi tiết

### Vấn đề
- Bên ngoài (AppHonorBoard) hiển thị **356.316.000 CAMLY** (từ RPC `get_app_stats`)
- Nhấp vào modal chi tiết hiển thị **293.581.000 CAMLY** (từ RPC `get_content_stats_grouped_vn` với type='rewards')
- Chênh lệch ~62 triệu CAMLY do hai RPC tính khác nhau

### Nguyên nhân gốc
So sánh logic tính rewards giữa 2 RPC, phát hiện **4 sai lệch** trong `get_content_stats_grouped_vn`:

| Yếu tố | `get_app_stats` (đúng) | `get_content_stats_grouped_vn` (sai) |
|---------|----------------------|-------------------------------------|
| **Friendships trước cutoff** | Đếm cả 2 phía (`user_id` + `friend_id`) | Đếm `user_id` **2 lần** (duplicate), bỏ sót `friend_id` |
| **Livestreams** | Dùng bảng `livestreams` + `is_eligible = true` | Dùng bảng `live_sessions` + `status = 'ended'` |
| **Timezone** | UTC | Asia/Ho_Chi_Minh (ảnh hưởng daily cap) |
| **PPLP mint** | Không tính | Có tính thêm `light_actions` mint |

### Giải pháp
Viết lại phần `rewards` trong RPC `get_content_stats_grouped_vn` để **đồng bộ hoàn toàn** với logic của `get_app_stats` và `get_user_rewards_v2`:

#### Migration SQL cần tạo:
- Sửa nhánh `p_type = 'rewards'` trong `get_content_stats_grouped_vn`:
  1. **Friendships trước cutoff**: Đếm cả `user_id` và `friend_id` (thay vì duplicate `user_id`)
  2. **Livestreams**: Dùng bảng `livestreams` với `is_eligible = true` (thay vì `live_sessions`)
  3. **Timezone**: Dùng UTC cho daily capping (giữ Asia/Ho_Chi_Minh cho display grouping)
  4. **Bỏ `light_actions`**: Loại phần PPLP mint để khớp với source of truth
  5. **Filter `is_banned = false`** cho new user bonus

### Quy mô
- 1 migration SQL duy nhất
- Không sửa code frontend (logic hiển thị đúng, chỉ data sai)

