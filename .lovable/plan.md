

## Sửa lỗi không hiển thị danh sách bạn bè của user khác

### Nguyên nhân gốc
RLS policy trên bảng `friendships` chỉ cho phép xem friendships mà mình tham gia:
```
qual: (auth.uid() = user_id) OR (auth.uid() = friend_id)
```
→ Khi query bạn bè của user khác, chỉ trả về friendship có chính mình → thiếu data.

### Giải pháp
Tạo một **database function** (security definer) để lấy danh sách bạn bè của bất kỳ user nào (chỉ friendships đã accepted), bypass RLS an toàn. Sau đó cập nhật `UserFriendsList` gọi function này thay vì query trực tiếp.

### Bước 1: Tạo database function
**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_friends(target_user_id uuid)
RETURNS TABLE (
  friend_id uuid,
  friendship_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN f.user_id = target_user_id THEN f.friend_id ELSE f.user_id END AS friend_id,
    f.id AS friendship_id
  FROM friendships f
  WHERE f.status = 'accepted'
    AND (f.user_id = target_user_id OR f.friend_id = target_user_id);
$$;
```
Hàm này trả về danh sách `friend_id` của bất kỳ user nào, chỉ lấy friendships `accepted` → an toàn, không lộ thông tin pending/rejected.

### Bước 2: Cập nhật `UserFriendsList.tsx`
**File:** `src/components/friends/UserFriendsList.tsx`

Thay query trực tiếp bảng `friendships` bằng gọi RPC:
```ts
const { data: friendships } = await supabase
  .rpc("get_user_friends", { target_user_id: profileUserId });
```
Sau đó dùng `friendIds` từ kết quả để fetch profiles như cũ. Logic build `relationMap` cho `currentUserId` giữ nguyên (query friendships của mình vẫn hoạt động vì RLS cho phép).

### File thay đổi
1. **Migration SQL** — tạo function `get_user_friends`
2. **`src/components/friends/UserFriendsList.tsx`** — đổi sang dùng `supabase.rpc("get_user_friends")`

