

# Hiển thị toàn bộ bài viết & ưu tiên bạn bè

## Vấn đề
1. Filter `moderation_status.eq.approved` khiến một số bài viết bị ẩn → không phải ai cũng thấy toàn bộ
2. Chưa có logic ưu tiên hiển thị bài viết của bạn bè lên trước

## Giải pháp — `src/hooks/useFeedPosts.ts`

### 1. Bỏ filter moderation_status
Xóa điều kiện `.or('moderation_status.eq.approved,...')` và `.eq('moderation_status', 'approved')` trong cả `fetchFeedPage` và `fetchHighlightedPosts` để tất cả bài viết đều hiển thị cho mọi người.

### 2. Ưu tiên bài viết bạn bè (client-side sort)
- Khi `currentUserId` tồn tại, fetch danh sách friend IDs từ bảng `friendships` (status = 'accepted')
- Cache friend IDs trong hook (chỉ fetch 1 lần)
- Sau khi fetch xong mỗi page, sort lại: bài của bạn bè lên trước, giữ nguyên thứ tự thời gian trong mỗi nhóm

```text
Flow:
  fetchFeedPage() → fetch 10 posts → sort:
    1. Bài của bạn bè (mới nhất trước)
    2. Bài của người khác (mới nhất trước)
```

### Chi tiết kỹ thuật

**Thêm hàm fetch friends:**
```typescript
const fetchFriendIds = async (userId: string): Promise<Set<string>> => {
  const { data } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  
  const ids = new Set<string>();
  (data || []).forEach(f => {
    ids.add(f.user_id === userId ? f.friend_id : f.user_id);
  });
  return ids;
};
```

**Sửa `fetchFeedPage`:** Nhận thêm `friendIds: Set<string>`, sau khi fetch xong sort bài bạn bè lên đầu.

**Sửa `useFeedPosts`:** Dùng `useQuery` để cache friend IDs, truyền vào `fetchFeedPage`.

**File cần sửa:** Chỉ `src/hooks/useFeedPosts.ts`

