
# Sửa 2 vấn đề: URL bỏ dấu @ + Kiểm tra Honor Board

## Vấn đề 1: URL hiển thị `/@angelaivan` thay vì `/angelaivan`

Hiện tại khi vào trang cá nhân qua route `/profile/:userId`, hệ thống tự động chuyển hướng sang `/@username`. Cần bỏ dấu `@` khỏi URL trên thanh địa chỉ.

**Lưu ý**: Route `/@:username` vẫn giữ lại để tương thích ngược (ai đã lưu link cũ vẫn vào được), nhưng sẽ tự động chuyển về `/:username`.

## Vấn đề 2: Giao diện Honor Board chưa cập nhật

Code frontend đã đúng công thức `claimable = total_reward - claimed`. Cần kiểm tra xem migration database đã chạy thành công chưa (thêm PPLP rewards vào tổng thu). Nếu migration chưa áp dụng, số liệu sẽ chưa thay đổi.

---

## Chi tiết kỹ thuật

### File 1: `src/pages/Profile.tsx`

3 chỗ cần sửa - bỏ `@` khỏi navigate:

- **Dòng 208**: `navigate(\`/@\${...}\`)` thay thành `navigate(\`/\${...}\`)`
- **Dòng 614**: `navigate(\`/@\${friend.username}\`)` thay thành `navigate(\`/\${friend.username}\`)`
- **Dòng 844**: `navigate(\`/@\${friend.username}\`)` thay thành `navigate(\`/\${friend.username}\`)`

### File 2: `src/App.tsx`

- **Dòng 135**: Giữ route `/@:username` nhưng thêm redirect tự động về `/:username` bằng cách thêm component Navigate, HOẶC đơn giản giữ nguyên vì Profile.tsx đã xử lý strip `@` ở dòng 96.

Quyết định: Giữ nguyên route `/@:username` trong App.tsx để tương thích ngược. Profile.tsx đã tự strip `@` khi xử lý.

### File 3: `src/components/auth/LawOfLightGuard.tsx`

- **Dòng 62**: Giữ nguyên `startsWith('/@')` vì vẫn cần cho phép khách truy cập URL cũ có `@`.

### Database: Kiểm tra migration PPLP

Chạy query kiểm tra xem migration đã áp dụng chưa. Nếu chưa, sẽ chạy lại migration để thêm PPLP rewards vào `get_user_honor_stats`.

### Tác động
- 1 file frontend sửa: `src/pages/Profile.tsx` (3 dòng)
- URL sẽ hiển thị sạch: `fun.rich/angelaivan` thay vì `fun.rich/@angelaivan`
- Link cũ có `@` vẫn hoạt động bình thường (tương thích ngược)
- Kiểm tra và đảm bảo migration database đã chạy đúng
