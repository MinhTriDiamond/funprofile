
# Fix: Tab chuyển đi quay lại bị thoát đăng nhập

## Nguyên nhân gốc

Khi con chuyển tab và quay lại, hệ thống `AuthSessionKeeper` gọi `refreshSession()`. Trong quá trình refresh token, sự kiện `TOKEN_REFRESHED` được phát ra. Tuy nhiên, **3 component** đang xử lý sự kiện auth sai cách — chúng đặt `isLoggedIn = !!session` cho MỌI sự kiện, kể cả khi `session` tạm thời là `null` trong lúc refresh. Điều này khiến giao diện hiển thị như chưa đăng nhập.

Các file lỗi:
1. **`FacebookNavbar.tsx`** (dòng 68-71): `setIsLoggedIn(!!session)` cho mọi event, không lọc
2. **`FacebookLeftSidebar.tsx`** (dòng 62-63): Tương tự — `setIsLoggedIn(!!session)` cho mọi event
3. **`LawOfLightGuard.tsx`**: Component này chạy lại `checkLawOfLightAcceptance()` khi `location.pathname` thay đổi, gọi `getSession()` — nếu đúng lúc token đang refresh thì session = null → redirect về `/law-of-light`

## Giải pháp

### 1. Sửa `FacebookNavbar.tsx`
Chỉ cập nhật state khi event rõ ràng:
- `SIGNED_IN` / `TOKEN_REFRESHED` → đăng nhập
- `SIGNED_OUT` → đăng xuất
- Các event khác → bỏ qua (giữ nguyên state hiện tại)

### 2. Sửa `FacebookLeftSidebar.tsx`
Áp dụng logic tương tự — chỉ phản ứng với `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`. Bọc async call (rpc `has_role`) trong `setTimeout(..., 0)` để tránh deadlock.

### 3. Sửa `LawOfLightGuard.tsx`
Thêm kiểm tra: nếu đã `isAllowed = true` rồi thì không chạy lại check khi `location.pathname` thay đổi (tránh gọi `getSession()` lúc token đang refresh).

## Chi tiết kỹ thuật

```text
Trước (lỗi):
  onAuthStateChange((event, session) => {
    setIsLoggedIn(!!session);  // ← session có thể null tạm thời
  })

Sau (sửa):
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      setIsLoggedIn(true);
      setCurrentUserId(session?.user?.id ?? null);
    } else if (event === 'SIGNED_OUT') {
      setIsLoggedIn(false);
      setCurrentUserId(null);
    }
    // INITIAL_SESSION, USER_UPDATED → giữ nguyên state
  })
```

### Các file cần sửa:
- `src/components/layout/FacebookNavbar.tsx` — dòng 68-71
- `src/components/feed/FacebookLeftSidebar.tsx` — dòng 62-74
- `src/components/auth/LawOfLightGuard.tsx` — dòng 15-124 (thêm guard tránh re-check khi đã allowed)
