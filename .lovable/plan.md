

# Tối ưu Profile: Tắt Realtime + Polling nhẹ thay thế

## Tóm tắt

- **Trang Feed**: Giữ nguyên Realtime — không thay đổi gì
- **Trang Profile**: Tắt Realtime (WebSocket) → thay bằng **polling gộp** mỗi 30s cho các bài đang hiển thị trên viewport

Như vậy user vẫn thấy reaction/comment cập nhật trên Profile, chỉ chậm tối đa 30 giây thay vì tức thì. Không mở hàng chục WebSocket channel.

## Thay đổi cụ thể

### 1. `src/hooks/usePostStats.ts`
- Thêm prop `disableRealtime?: boolean`
- Khi `true`: bỏ qua subscription `supabase.channel(...)`, không tạo WebSocket

### 2. Tạo `src/hooks/useProfilePolling.ts` (file mới)
- Nhận danh sách `postIds` đang hiển thị trên viewport
- Mỗi 30 giây, fetch stats gộp cho tất cả bài trong 1-2 query (thay vì 1 query/bài):
  - `reactions` WHERE `post_id IN (...)` 
  - `comments` count grouped by `post_id`
- Trả về map `postId → { likeCount, commentCount, reactionCounts }`
- Dùng `IntersectionObserver` để chỉ poll cho bài đang visible

### 3. `src/components/feed/FacebookPostCard.tsx`
- Thêm prop `disableRealtime?: boolean`, truyền xuống `usePostStats`
- Thêm prop `polledStats?` để nhận stats từ polling hook

### 4. `src/components/feed/GiftCelebrationCard.tsx`
- Tương tự: thêm `disableRealtime` + `disableEffects` + `polledStats`

### 5. `src/components/profile/ProfilePosts.tsx`
- Truyền `disableRealtime={true}` cho tất cả post cards
- Tích hợp `useProfilePolling` với danh sách `displayedPosts`
- Truyền `polledStats` xuống từng card

### 6. `src/hooks/useProfile.ts`
- Dùng `useRef` cho `currentUserId` để ổn định dependency → tránh re-fetch khi token refresh

### 7. `src/components/feed/CommentSection.tsx`
- Thêm prop `disableRealtime?: boolean`
- Khi `true`: không tạo channel `comments-{postId}`, chỉ fetch comments khi mount

## So sánh

| | Trước | Sau |
|---|---|---|
| WebSocket channels/profile | 10-40 | 0 |
| Cập nhật reaction/comment | Tức thì | Chậm tối đa 30s |
| Query mỗi 30s | 0 (nhưng hàng trăm query realtime callback) | 2 query gộp |
| Trang Feed | Realtime | Realtime (không đổi) |

Tổng: sửa **6 file**, tạo **1 file mới**. Không thay đổi database.

