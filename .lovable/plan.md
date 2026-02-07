
# 🔧 Kế Hoạch Sửa Lỗi: Tính Năng Thông Báo

## 📋 Vấn Đề Phát Hiện

Khi gọi API notifications, Supabase trả về lỗi:

```
PGRST200: Could not find a relationship between 'notifications' and 'actor_id' in the schema cache
```

### Nguyên Nhân:
Bảng `notifications` có các cột `actor_id` và `post_id` nhưng **KHÔNG có foreign key constraints** đến bảng `profiles` và `posts`. Do đó, Supabase PostgREST không thể thực hiện join query.

### Schema hiện tại:

| Column | Type | Has FK? |
|--------|------|---------|
| id | uuid | Primary Key |
| user_id | uuid | Không |
| actor_id | uuid | Không |
| post_id | uuid (nullable) | Không |
| type | text | - |
| read | boolean | - |
| created_at | timestamp | - |

---

## 🎯 Giải Pháp

### Bước 1: Thêm Foreign Key Constraints

Thêm 3 foreign keys:
1. `notifications.user_id` → `profiles.id`
2. `notifications.actor_id` → `profiles.id`  
3. `notifications.post_id` → `posts.id`

### Bước 2: Sửa Query trong Code

Sau khi có FK, sửa lại syntax join:

```text
Trước (lỗi):
actor:actor_id (id, username, avatar_url)

Sau (đúng):
actor:profiles!notifications_actor_id_fkey (id, username, avatar_url)
```

---

## 📁 Files Cần Sửa

| # | File | Thay Đổi |
|---|------|----------|
| 1 | Database Migration | Thêm 3 foreign keys |
| 2 | NotificationDropdown.tsx | Sửa join query syntax |
| 3 | Notifications.tsx | Sửa join query syntax (nếu cần) |

---

## 📝 Chi Tiết Migration SQL

```sql
-- Add foreign key for user_id → profiles.id
ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for actor_id → profiles.id  
ALTER TABLE notifications
ADD CONSTRAINT notifications_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for post_id → posts.id
ALTER TABLE notifications
ADD CONSTRAINT notifications_post_id_fkey
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
```

---

## 📝 Chi Tiết Code Changes

### NotificationDropdown.tsx - Sửa Query (dòng 50-71)

```text
Trước:
.select(`
  id,
  type,
  read,
  created_at,
  post_id,
  actor:actor_id (
    id,
    username,
    avatar_url,
    full_name
  ),
  post:post_id (
    id,
    content
  )
`)

Sau:
.select(`
  id,
  type,
  read,
  created_at,
  post_id,
  actor:profiles!notifications_actor_id_fkey (
    id,
    username,
    avatar_url,
    full_name
  ),
  post:posts!notifications_post_id_fkey (
    id,
    content
  )
`)
```

### Notifications.tsx - Đã có syntax đúng (giữ nguyên)

Dòng 64: `actor:profiles!notifications_actor_id_fkey(...)` - Đã đúng, chỉ cần thêm FK vào database.

---

## ⏱️ Timeline

| # | Task | Thời gian |
|---|------|-----------|
| 1 | Tạo migration thêm foreign keys | 2 phút |
| 2 | Sửa NotificationDropdown.tsx query | 2 phút |
| 3 | Testing | 3 phút |
| **Tổng** | | **~7 phút** |

---

## ✅ Kết Quả Mong Đợi

Sau khi sửa:
- Query notifications hoạt động bình thường
- Lấy được thông tin actor (username, avatar)
- Lấy được snippet nội dung bài viết
- Dropdown thông báo hiển thị đầy đủ thông tin

---

## ⚠️ Lưu Ý

- Build error `429 Too Many Requests` là lỗi tạm thời của CloudFlare R2, không liên quan đến code
- Migration sẽ tự động refresh schema cache của PostgREST
