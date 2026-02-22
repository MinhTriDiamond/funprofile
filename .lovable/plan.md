
# Cho phep Guest xem trang Danh sach thanh vien

## Van de
Trang `/users` khong nam trong danh sach `guestAllowedPaths` cua `LawOfLightGuard`. Khi Guest (chua dang nhap) truy cap `/users`, ho bi chuyen huong ve `/law-of-light` thay vi duoc xem noi dung.

Cac ham database `get_user_directory_summary` va `get_user_directory_totals` da duoc cau hinh dung (SECURITY DEFINER, grant cho PUBLIC), nen van de chi nam o phia frontend.

## Giai phap

### 1. Them `/users` vao danh sach Guest Allowed Paths
Trong file `src/components/auth/LawOfLightGuard.tsx`, them `/users` vao mang `guestAllowedPaths` (dong 44):

```
const guestAllowedPaths = ['/', '/feed', '/about', '/install', '/leaderboard', '/benefactors', '/donations', '/mint', '/users'];
```

Chi can thay doi duy nhat dong nay. Tat ca logic khac (RPC functions, hook, UI) da hoat dong dung.

## Chi tiet ky thuat
- File can sua: `src/components/auth/LawOfLightGuard.tsx` - dong 44
- Thay doi: them `'/users'` vao mang `guestAllowedPaths`
- Khong can thay doi database, hook, hay UI
