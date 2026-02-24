

# Cho phep Guest xem tat ca noi dung khong can dang nhap

## Van de
Hien tai `LawOfLightGuard` su dung **danh sach trang cho phep** (whitelist) cho guest. Chi nhung path nam trong danh sach moi duoc truy cap. Bat ky path nao khong co trong danh sach (vi du link bai viet `/post/abc`, hoac cac path moi) deu bi chuyen huong ve `/law-of-light` va yeu cau dang nhap.

## Giai phap
Dao nguoc logic: thay vi **whitelist** (chi cho phep mot so path), chuyen sang **blacklist** (chi chan mot so path rieng tu). Guest se duoc xem **tat ca** ngoai tru cac trang yeu cau dang nhap.

### Cac path bi chan (chi danh cho user da dang nhap):
- `/admin` -- Trang quan tri
- `/set-password` -- Dat mat khau
- `/begin` -- Onboarding
- `/connected-apps` -- Ung dung ket noi

Tat ca cac path con lai (bao gom `/post/...`, `/:username/post/...`, `/feed`, `/reels/...`, `/profile/...`, `/live/...`, v.v.) deu **mo cong khai** cho guest.

## Chi tiet ky thuat

### File: `src/components/auth/LawOfLightGuard.tsx`
Thay doi khoi `if (!session)` (dong 46-81):

**Truoc**: Kiem tra `isGuestPath` voi danh sach whitelist dai -> neu khong match thi redirect.

**Sau**: Kiem tra `isProtectedPath` voi danh sach blacklist ngan -> chi redirect khi match path rieng tu.

```typescript
if (!session) {
  // Only these paths require login
  const protectedPrefixes = ['/admin', '/set-password', '/begin', '/connected-apps'];
  const isProtectedPath = protectedPrefixes.some(p => location.pathname.startsWith(p));

  if (!isProtectedPath) {
    // Guest can view everything else
    setIsAllowed(true);
    setIsChecking(false);
    return;
  }
  // Protected path -> redirect to law-of-light
  setIsChecking(false);
  navigate('/law-of-light', { replace: true });
  return;
}
```

Thay doi nay loai bo toan bo logic phuc tap ve `guestAllowedPaths`, `reservedPaths`, `isBareUsername`, `isUsernameContentPath`, `isGuestPath` -- thay bang 5 dong don gian.

### Ket qua
- Guest bam vao bat ky link bai viet, profile, reels, live... deu xem duoc ngay
- Khong can cap nhat danh sach moi khi them route moi
- Chi 4 khu vuc rieng tu van yeu cau dang nhap
