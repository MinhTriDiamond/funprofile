

# Cập nhật: Guest xem được tất cả + Avatar rõ nét trên điện thoại

## 1. Guest (khách) xem được tất cả khi vào link

**Vấn đề hiện tại:** Trang `/friends` yêu cầu đăng nhập (redirect về `/auth` nếu chưa login). Trang `/live/*` cũng chưa được liệt kê trong `guestAllowedPaths` của `LawOfLightGuard`.

**Giải pháp:**
- **File `src/components/auth/LawOfLightGuard.tsx`** (dòng 47): Thêm `/friends`, `/live`, `/wallet`, `/chat`, `/notifications`, `/admin` vào danh sách `guestAllowedPaths`, hoặc đơn giản hóa bằng cách cho phép tất cả các path khi là khách (fail-open cho viewing).
- Cụ thể, thêm các path sau vào `guestAllowedPaths`:
  - `/friends`
  - `/live`
  - `/wallet`
  - `/chat`
  - `/notifications`

- **File `src/pages/Friends.tsx`** (dòng 26-31): Thay vì redirect về `/auth` khi chưa đăng nhập, cho phép guest xem danh sách bạn bè ở chế độ read-only (hiển thị suggestions, không hiển thị sent/received requests).

## 2. Avatar/ảnh user hiện rõ nét trên điện thoại

**Vấn đề hiện tại:** Trong phần "Bạn bè" trên Profile (dòng 846), Avatar dùng `sizeHint="md"` (128px). Trên màn hình retina mobile, avatar hiển thị mờ vì kích thước thực tế lớn hơn 128px nhưng ảnh chỉ được tải ở 128px.

Trong `FriendCarousel.tsx`, ảnh dùng `LazyImage` không qua Cloudflare optimization nên có thể tải ảnh gốc quá lớn hoặc không đúng kích thước.

**Giải pháp:**

### File `src/pages/Profile.tsx` (dòng 846-851):
- Tăng `sizeHint` từ `"md"` lên `"lg"` cho avatar bạn bè trong grid 3 cột để ảnh rõ nét hơn trên mobile retina.

### File `src/components/friends/FriendCarousel.tsx` (dòng 186-191):
- Thay `LazyImage` bằng Avatar component có `sizeHint="lg"` để ảnh được tối ưu qua Cloudflare với kích thước phù hợp (256px) cho card 160px trên retina.

### File `src/components/friends/FriendsList.tsx` (dòng 288):
- Thêm `sizeHint="md"` vào `AvatarImage` để đảm bảo ảnh avatar bạn bè trong danh sách cũng rõ nét.

---

## Chi tiết kỹ thuật

### Tổng cộng 4 file cần sửa:
1. `src/components/auth/LawOfLightGuard.tsx` - Mở rộng guest paths
2. `src/pages/Friends.tsx` - Cho phép guest xem read-only
3. `src/pages/Profile.tsx` - Avatar sizeHint "lg" cho friends grid
4. `src/components/friends/FriendCarousel.tsx` - Dùng Avatar component thay LazyImage
5. `src/components/friends/FriendsList.tsx` - Thêm sizeHint cho AvatarImage

