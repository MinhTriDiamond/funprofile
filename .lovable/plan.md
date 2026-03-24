

## Sửa lỗi: Số liệu không khớp giữa tổng và chi tiết cho TẤT CẢ các mục Honor Board

### Nguyên nhân gốc
Ba RPC function (`get_content_stats_grouped_vn`, `get_content_users_by_period_vn`, `get_user_posts_by_period_vn`) dùng **điều kiện lọc khác nhau** cho cùng một mục:

| Mục | Trang tổng (stats) | Trang chi tiết user (users) | Khác biệt |
|-----|--------------------|-----------------------------|-----------|
| **Bài viết** | Tất cả trừ gift_celebration | Chỉ `post_type = 'normal'` | Users bỏ sót bài video, live, v.v. |
| **Hình ảnh** | `image_url IS NOT NULL` | `image_url OR media_urls` | Stats thiếu bài có media_urls |
| **Video** | `video_url IS NOT NULL`, trừ gift | Thêm trừ `live`, `gift` | Stats đếm cả livestream replay |
| **Livestream** | Tất cả `live_sessions` | Chỉ `status = 'ended'` | Stats đếm cả phiên đang live/lỗi |
| **Rewards** | ✅ Đã sửa | ✅ Đã sửa | OK |

### Giải pháp
**1 migration SQL** cập nhật cả 3 RPC function để đồng bộ điều kiện lọc:

**Posts** — Tất cả 3 function: `(post_type IS NULL OR post_type NOT IN ('gift_celebration'))`
- Sửa `get_content_users_by_period_vn`: bỏ `post_type = 'normal'`, thay bằng điều kiện trên

**Photos** — Tất cả 3 function: `(image_url IS NOT NULL OR (media_urls IS NOT NULL AND media_urls != '[]')) AND video_url IS NULL AND post_type NOT IN ('video', 'gift_celebration')`
- Sửa `get_content_stats_grouped_vn`: thêm kiểm tra `media_urls`, loại trừ video

**Videos** — Tất cả 3 function: `video_url IS NOT NULL AND post_type NOT IN ('live', 'gift_celebration')`
- Sửa `get_content_stats_grouped_vn`: thêm loại trừ `live`

**Livestreams** — Tất cả 3 function: `live_sessions WHERE status = 'ended'`
- Sửa `get_content_stats_grouped_vn`: thêm `AND ls.status = 'ended'`

### Kết quả
Tổng ở trang ngoài = tổng cộng user ở trang chi tiết = tổng bài của từng user — tất cả khớp nhau cho mọi mục.

