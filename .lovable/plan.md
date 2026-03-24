

## Sửa `get_user_honor_stats` — loại gift_celebration khỏi tính thưởng

### Vấn đề
Hàm `get_user_honor_stats` vẫn cộng CAMLY từ bài gift. Migration trước chỉ sửa được `get_user_rewards_v2`, chưa sửa được hàm này.

User thực tế: có 8 gift posts hôm nay → đang bị cộng thừa ~40.000 CAMLY.

### Giải pháp
Tạo migration mới DROP + CREATE lại `get_user_honor_stats`, thêm điều kiện chuẩn vào **4 chỗ**:

```sql
AND (post_type IS NULL OR post_type <> 'gift_celebration')
```

Áp dụng cho:
1. `v_old_posts` (dòng 37)
2. `v_new_posts` (dòng 54-58)
3. `v_today_posts` (dòng 113-114)
4. `v_actual_posts` (dòng 145-146) — sửa từ `!=` sang `IS NULL OR <>`

### Không thay đổi
- `get_user_rewards_v2` — đã đúng
- Frontend — đã đúng
- Các phần khác giữ nguyên

### File thay đổi
- `supabase/migrations/...new.sql` — DROP + CREATE `get_user_honor_stats`

