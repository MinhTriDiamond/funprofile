

## Thêm trang xem tất cả bạn bè của user khác (với nút Kết bạn)

### Vấn đề hiện tại
- `FriendsList` hiện chỉ phục vụ **chủ profile** (hiện tabs: Bạn bè, Lời mời, Đã gửi, Gợi ý).
- Khi xem profile người khác, tab "Bạn bè" cũng dùng cùng component → không phù hợp vì user khác không cần thấy Lời mời/Đã gửi/Gợi ý.
- Chưa có nút **Kết bạn** bên cạnh mỗi người bạn của user đó.

### Giải pháp

#### Bước 1: Tạo component `UserFriendsList`
**File mới:** `src/components/friends/UserFriendsList.tsx`

Component hiển thị **danh sách bạn bè của một user bất kỳ** (không phải mình):
- Fetch tất cả friendships `status = accepted` của `userId` đó.
- Hiển thị danh sách bạn bè (avatar, tên, @username).
- Bên cạnh mỗi người bạn:
  - Nếu **đã là bạn mình** → hiện badge "Bạn bè".
  - Nếu **đã gửi lời mời** → hiện "Đã gửi" (disabled).
  - Nếu **chưa kết bạn** → hiện nút **"Kết bạn"** (UserPlus icon).
  - Nếu **là chính mình** → không hiện nút.
- Style tương tự `FriendItem` hiện có trong `FriendsList.tsx`.

#### Bước 2: Cập nhật Profile.tsx
**File:** `src/pages/Profile.tsx`

- Import `UserFriendsList`.
- Trong tab "friends" (dòng ~333-338):
  - Nếu `isOwnProfile` → render `FriendsList` (giữ nguyên).
  - Nếu **không phải profile mình** → render `UserFriendsList` với `profileUserId` và `currentUserId`.

#### Bước 3: Cập nhật Friends Card sidebar
**File:** `src/pages/Profile.tsx` (dòng ~212-238)

- Khi xem profile người khác, nút "Xem tất cả bạn bè" sẽ chuyển sang tab `friends` → hiện `UserFriendsList`.

### File thay đổi
1. `src/components/friends/UserFriendsList.tsx` — component mới hiển thị bạn bè của user khác + nút kết bạn
2. `src/pages/Profile.tsx` — phân biệt render `FriendsList` vs `UserFriendsList` theo `isOwnProfile`

