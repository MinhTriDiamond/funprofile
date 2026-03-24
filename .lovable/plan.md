

## Thêm liên kết đến trang cá nhân từ UserPostsDetail

### Vấn đề
Trong modal chi tiết bài viết (UserPostsDetail), tên user hiển thị ở dòng "WF HÀZÀËL — 3 bài viết" nhưng không nhấp được để đi đến trang cá nhân.

### Giải pháp

#### 1. Cập nhật `ContentStatsDateDetail.tsx`
- Truyền thêm prop `username` vào `UserPostsDetail` từ `selectedUser` (đã có sẵn trong `UserRow.username`)

#### 2. Cập nhật `UserPostsDetail.tsx`
- Thêm prop `username?: string` vào interface Props
- Import `useNavigate` từ `react-router-dom`
- Biến `displayName` trong dòng tiêu đề thành một link/button nhấp được
- Khi nhấp vào tên → `navigate('/' + username)` để đi đến trang cá nhân
- Style: thêm `cursor-pointer hover:underline` cho tên user

### Files thay đổi
- `src/components/feed/ContentStatsDateDetail.tsx` — truyền thêm `username` prop
- `src/components/feed/UserPostsDetail.tsx` — nhận `username`, biến tên thành link điều hướng

