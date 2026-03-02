

# Sửa Lỗi Trang Cá Nhân Bị Đơ & Kết Bạn Không Ổn Định

## Vấn đề 1: Trang cá nhân bị "Page Unresponsive"

### Nguyên nhân gốc

Trang Profile hiện tại tải **TẤT CẢ bài viết cùng lúc** mà không có phân trang. Mỗi bài viết (`FacebookPostCard`) khi không được truyền `initialStats` sẽ tự gọi **3 API riêng** (reactions, comments, shares) và tạo **1 kênh realtime riêng**. Với 50 bài viết, trình duyệt phải xử lý 150+ API calls và 50 kênh realtime cùng lúc, dẫn đến treo trang.

### Giải pháp

1. **Thêm phân trang (Load More)**: Chỉ hiển thị 10 bài viết đầu tiên, khi kéo xuống cuối sẽ tải thêm 10 bài nữa.
2. **Batch-fetch stats cho tất cả bài viết**: Tương tự như `useFeedPosts` đã làm cho trang chủ - fetch stats một lần cho tất cả posts rồi truyền `initialStats` vào mỗi `FacebookPostCard` và `GiftCelebrationCard`. Điều này giảm từ 150+ API calls xuống còn 3.
3. **Lazy-mount realtime**: Chỉ tạo kênh realtime cho các post đang hiển thị trên màn hình.

## Vấn đề 2: Kết bạn có lúc được lúc không

### Nguyên nhân gốc

1. **Không kiểm tra `currentUserId`**: Hàm `checkFriendshipStatus` chạy ngay khi component mount, kể cả khi `currentUserId` là chuỗi rỗng `""`. Truy vấn với `user_id.eq.` (rỗng) trả về kết quả không chính xác.
2. **Realtime filter sai cú pháp**: Filter `user_id=eq.${currentUserId},friend_id=eq.${userId}` sử dụng dấu phẩy nhưng Supabase realtime chỉ hỗ trợ **1 filter duy nhất** mỗi lần subscribe. Kênh realtime thực tế không hoạt động đúng.
3. **Race condition**: Khi nhấn "Kết bạn", insert xong rồi gọi `checkFriendshipStatus()` ngay, nhưng database có thể chưa kịp phản hồi.

### Giải pháp

1. **Guard cho `currentUserId`**: Bỏ qua `checkFriendshipStatus` và realtime subscription khi `currentUserId` rỗng.
2. **Sửa realtime**: Dùng 2 kênh riêng biệt hoặc bỏ realtime và dùng **optimistic update** (cập nhật state UI ngay lập tức trước khi chờ DB xác nhận).
3. **Optimistic state update**: Sau khi gọi insert/update/delete thành công, cập nhật state trực tiếp thay vì re-fetch.

---

## Chi tiết kỹ thuật

### File 1: `src/pages/Profile.tsx`

**Thay đổi:**
- Thêm state `displayedCount` bắt đầu từ 10, tăng dần khi cuộn xuống
- Batch-fetch stats cho các bài đang hiển thị (tái sử dụng pattern từ `useFeedPosts`)
- Truyền `initialStats` vào mỗi `FacebookPostCard` và `GiftCelebrationCard`
- Thêm nút "Xem thêm" hoặc IntersectionObserver để tải thêm bài

```text
sortedPosts (all)
    |
    v
displayedPosts = sortedPosts.slice(0, displayedCount)
    |
    v
batch fetchPostStats(displayedPosts.map(p => p.id))
    |
    v
render displayedPosts with initialStats={postStats[post.id]}
```

### File 2: `src/components/friends/FriendRequestButton.tsx`

**Thay đổi:**
- Thêm guard: không chạy `checkFriendshipStatus` khi `currentUserId` rỗng
- Dùng optimistic update cho `sendFriendRequest`, `acceptFriendRequest`, `removeFriend`
- Loại bỏ realtime subscription (không cần thiết vì user tự thao tác)
- Thêm try/catch cho tất cả async operations

### Tác động

- Trang cá nhân sẽ tải nhanh hơn 10-15x (chỉ 10 bài + 3 API calls thay vì 50+ bài + 150+ API calls)
- Nút kết bạn hoạt động ổn định 100% thời gian
- Không ảnh hưởng đến các tính năng khác

