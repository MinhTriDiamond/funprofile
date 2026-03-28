

## Sửa lỗi video livestream không hiển thị trong Tổng Livestream

### Nguyên nhân
Trong hàm SQL `get_user_posts_by_period_vn`, phần query livestreams dùng:
```sql
WHERE c.live_session_id = ls.id AND c.status = 'ready'
```
Nhưng trong bảng `chunked_recordings`, status thực tế là **`'done'`** (không phải `'ready'`). Vì vậy JOIN không match được → `video_url` trả về NULL → UI không hiển thị video.

### Giải pháp
Cập nhật hàm SQL: đổi `c.status = 'ready'` thành `c.status = 'done'` trong phần livestreams query.

### Chi tiết kỹ thuật
Tạo migration mới sửa dòng 97 trong function:
```sql
-- Trước: AND c.status = 'ready'
-- Sau:   AND c.status = 'done'
```

Chỉ cần 1 migration SQL, không cần sửa code frontend.

