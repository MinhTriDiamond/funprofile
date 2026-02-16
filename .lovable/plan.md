
# Fix: Hien thi day du link http://fun.rich/username tren trang ca nhan

## Van de
Tren trang xem ho so ca nhan (Profile.tsx), dong 468 hien thi link chi la `fun.rich/username` thay vi `http://fun.rich/username`. Nut copy da hoat dong dung (copy day du URL voi `http://`), nhung phan text hien thi thi thieu prefix.

## Giai phap
Chi can sua 1 dong trong file `src/pages/Profile.tsx` tai dong 468, them `http://` vao truoc text hien thi.

## Chi tiet ky thuat
- **File**: `src/pages/Profile.tsx`, dong 468
- **Truoc**: `fun.rich/{profile?.username}`
- **Sau**: `http://fun.rich/{profile?.username}`
