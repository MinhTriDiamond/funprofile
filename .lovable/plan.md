
# Sửa lỗi link hồ sơ bắt đăng nhập và redirect sai domain

## Nguyên nhân gốc

### Lỗi 1: LawOfLightGuard chặn đường dẫn /:username
Trong file `src/components/auth/LawOfLightGuard.tsx`, dòng 44-49, danh sách đường dẫn cho phép khách (guest) truy cập:

```
const guestAllowedPaths = ['/', '/feed', '/about', '/install', '/leaderboard', '/benefactors', '/donations'];
const isGuestPath = guestAllowedPaths.includes(location.pathname)
  || location.pathname.startsWith('/profile/')
  || location.pathname.startsWith('/@')
  || location.pathname.startsWith('/post/')
  || location.pathname.startsWith('/reels');
```

Vấn đề: Route `/:username` (ví dụ `/van103`) **không khớp** với bất kỳ điều kiện nào ở trên. Khi khách mở link `fun.rich/van103`:
1. Guard thấy không có session
2. Path `/van103` không nằm trong danh sách cho phép
3. Redirect về `/law-of-light` rồi `/auth`
4. Sau đăng nhập, URL bị chuyển về domain Lovable thay vì fun.rich

### Lỗi 2: Link copy dùng http thay vì https
Trong `src/pages/Profile.tsx` dòng 468 và 472, link hồ sơ dùng `http://fun.rich/` thay vì `https://fun.rich/`.

---

## Giải pháp

### File 1: `src/components/auth/LawOfLightGuard.tsx`
**Dòng 44-49** - Thêm logic nhận diện đường dẫn `/:username`:

```typescript
const guestAllowedPaths = ['/', '/feed', '/about', '/install', '/leaderboard', '/benefactors', '/donations'];

// Danh sách các path tĩnh đã đăng ký trong router (không phải username)
const reservedPaths = ['auth', 'feed', 'friends', 'wallet', 'about', 'leaderboard', 
  'admin', 'notifications', 'docs', 'post', 'law-of-light', 'profile', 'chat', 
  'install', 'benefactors', 'donations', 'users', 'reels', 'mint', 'set-password',
  'begin', 'connected-apps'];

// Kiểm tra xem path có phải là /:username (bare username) không
const pathSegments = location.pathname.split('/').filter(Boolean);
const isBareUsername = pathSegments.length === 1 
  && !reservedPaths.includes(pathSegments[0].toLowerCase());

const isGuestPath = guestAllowedPaths.includes(location.pathname)
  || location.pathname.startsWith('/profile/')
  || location.pathname.startsWith('/@')
  || location.pathname.startsWith('/post/')
  || location.pathname.startsWith('/reels')
  || isBareUsername;  // Cho phép khách xem hồ sơ qua /:username
```

### File 2: `src/pages/Profile.tsx`
**Dòng 468** - Đổi `http://` thành `https://`:
```
href={`https://fun.rich/${profile?.username}`}
```
(Dòng này đã đúng `https://` rồi - chỉ cần sửa phần hiển thị text)

**Dòng 472** - Sửa link copy từ `http://` thành `https://`:
```typescript
navigator.clipboard.writeText(`https://fun.rich/${profile?.username}`);
```

**Dòng 468** - Sửa text hiển thị từ `http://` thành `https://`:
```
fun.rich/{profile?.username}
```
(Bỏ prefix `http://` trong text hiển thị, giữ `https://` trong href)

---

## Kết quả mong đợi
- Khách mở link `fun.rich/van103` sẽ xem được hồ sơ mà **không cần đăng nhập**
- Link copy luôn dùng `https://fun.rich/username`
- Sau đăng nhập, người dùng vẫn ở trên domain `fun.rich` thay vì bị chuyển về Lovable
