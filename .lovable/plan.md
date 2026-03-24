

## Sửa lỗi: Số liệu Tổng Phần Thưởng không khớp giữa trang tổng và chi tiết

### Nguyên nhân gốc
Hai RPC function dùng **nguồn dữ liệu khác nhau** cho type `rewards`:

| View | RPC | Nguồn | Đo gì |
|------|-----|-------|-------|
| Trang tổng (bảng ngày) | `get_content_stats_grouped_vn` | `reward_claims.amount` | **CAMLY đã rút** |
| Trang chi tiết (danh sách user) | `get_content_users_by_period_vn` | `light_actions.light_score` | **Điểm Ánh sáng** |

→ Ngày 10/03: Tổng = 4.888.000 CAMLY (từ reward_claims) nhưng chi tiết = 9.458 (từ light_score). Hoàn toàn khác nhau.

### Giải pháp
Sửa RPC `get_content_users_by_period_vn` phần `rewards` để cũng dùng bảng `reward_claims` (giống `get_content_stats_grouped_vn`), thay vì `light_actions`:

```sql
ELSIF p_type = 'rewards' THEN
  RETURN QUERY
    SELECT rc.user_id, pr.username, 
           COALESCE(pr.display_name, pr.full_name)::text AS display_name,
           pr.avatar_url, 
           SUM(rc.amount)::bigint AS post_count, 
           pr.social_links::jsonb
    FROM reward_claims rc
    JOIN public_profiles pr ON pr.id = rc.user_id
    WHERE rc.created_at >= v_start AND rc.created_at < v_end
    GROUP BY rc.user_id, pr.username, pr.display_name, pr.full_name, 
             pr.avatar_url, pr.social_links
    ORDER BY post_count DESC;
```

Tương tự, sửa RPC `get_user_posts_by_period_vn` phần `rewards` để hiển thị chi tiết từng lệnh rút từ `reward_claims` thay vì `light_actions`.

### File thay đổi
- **1 migration SQL**: Cập nhật 2 RPC functions (`get_content_users_by_period_vn` và `get_user_posts_by_period_vn`) để dùng `reward_claims` cho type `rewards`

### Kết quả
- Tổng CAMLY ở trang bảng ngày = tổng cộng CAMLY ở trang chi tiết user = tổng từng lệnh rút của user → tất cả khớp nhau

