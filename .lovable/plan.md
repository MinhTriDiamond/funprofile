

## Nguyên nhân: `handle_new_user()` không sync email vào profiles

Trigger `handle_new_user()` chạy khi user mới được tạo trong hệ thống auth, nhưng **không bao gồm cột `email`** trong câu INSERT:

```sql
-- Hiện tại (thiếu email):
INSERT INTO public.profiles (id, username, full_name, avatar_url)
VALUES (NEW.id, final_username, ..., ...);
```

### Thống kê ảnh hưởng
- **16 profiles** thiếu email (trong tổng 711)
- **10 trong số đó** là user đăng ký bằng Email OTP

### Kế hoạch fix

**1. Sửa trigger `handle_new_user()`** — thêm `email` vào INSERT:

```sql
INSERT INTO public.profiles (id, username, full_name, avatar_url, email)
VALUES (NEW.id, final_username,
  COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
  COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
  LOWER(NEW.email));
```

**2. Backfill 16 profiles hiện tại** — sync email từ `auth.users` cho các profiles đang thiếu:

```sql
UPDATE profiles p
SET email = LOWER(u.email)
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL AND u.email IS NOT NULL;
```

Chỉ cần 1 migration với 2 thay đổi trên là đủ.

