
# Kế Hoạch Sửa Lỗi Hoàn Chỉnh: Tính Năng Thông Báo

## Vấn Đề Phát Hiện

Sau khi test, API thông báo vẫn trả về lỗi 400:

```
PGRST200: Could not find a relationship between 'notifications' and 'profiles' in the schema cache
```

### Nguyên Nhân Gốc

Foreign keys trong bảng `notifications` đang trỏ đến **SAI BẢNG**:

| Foreign Key | Đang Trỏ Đến | Cần Trỏ Đến |
|-------------|--------------|-------------|
| `notifications_user_id_fkey` | `auth.users` | `public.profiles` |
| `notifications_actor_id_fkey` | `auth.users` | `public.profiles` |
| `notifications_post_id_fkey` | `public.posts` | (Đúng rồi) |

PostgREST không thể join với schema `auth`, nên query thất bại.

---

## Giải Pháp

### Bước 1: Sửa Foreign Keys trong Database

Xóa các foreign keys sai và tạo lại đúng:

```sql
-- Xóa FK sai (đang trỏ đến auth.users)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

-- Tạo FK mới trỏ đến public.profiles
ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT notifications_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### Bước 2: Không cần thay đổi code

Code đã đúng syntax:
- `actor:profiles!notifications_actor_id_fkey`
- `post:posts!notifications_post_id_fkey`

Chỉ cần sửa FK trong database là hoạt động.

---

## Files Cần Thay Đổi

| # | Loại | File/Action | Chi Tiết |
|---|------|-------------|----------|
| 1 | Database | Migration SQL | Xóa và tạo lại 2 foreign keys |
| 2 | Code | Không cần thay đổi | Query đã đúng syntax |

---

## Timeline

| Task | Thời gian |
|------|-----------|
| Tạo migration sửa foreign keys | 1 phút |
| Testing lại | 2 phút |
| **Tổng** | **~3 phút** |

---

## Kết Quả Mong Đợi

Sau khi sửa FK:
- Query notifications hoạt động bình thường
- Dropdown thông báo hiển thị đầy đủ thông tin
- Hiển thị avatar, username của actor
- Hiển thị snippet nội dung bài viết
- Các tính năng khác (phân nhóm, lọc, realtime) hoạt động

---

## Lưu Ý Kỹ Thuật

- `auth.users` là bảng hệ thống của Supabase, không thể join qua PostgREST API
- `public.profiles` là bảng public, có thể join bình thường
- PostgREST schema cache sẽ tự động refresh sau khi migration chạy xong
