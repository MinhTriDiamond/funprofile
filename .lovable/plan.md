

## Sửa lỗi user đăng nhập bị thoát ra liên tục

### Phân tích nguyên nhân

Sau khi kiểm tra toàn bộ luồng auth, phát hiện **3 vấn đề** có thể gây logout sai:

**1. `useCurrentUser` không xử lý `INITIAL_SESSION`**
Khi app load, Supabase SDK phát event `INITIAL_SESSION` (không phải `SIGNED_IN`). Hook hiện chỉ xử lý `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED`, `SIGNED_OUT`. Nếu `fetchCurrentUser()` chạy trước khi session được khôi phục từ storage → cache `user = null` → tất cả component thấy user chưa đăng nhập.

**2. `LawOfLightGuard` subscription leak + no debounce SIGNED_OUT**
- Khi `isAllowed = true`, effect returns early → **không tạo subscription mới** nhưng cũng **đã cleanup subscription cũ**. Từ thời điểm đó không còn auth listener → nếu session bị invalid, Guard không biết.
- `SIGNED_OUT` trong Guard redirect ngay lập tức, không có delay. Nếu token refresh thất bại tạm thời (network glitch), Supabase có thể phát `SIGNED_OUT` rồi `SIGNED_IN` ngay sau → user bị kick ra.

**3. Nhiều `onAuthStateChange` listener hoạt động đồng thời**
Có ít nhất 5-6 listener khác nhau (useCurrentUser, LawOfLightGuard, Auth.tsx, SocialLogin.tsx, SecuritySettings, usePendingDonationRecovery). Mỗi listener xử lý auth events độc lập → race conditions.

### Thay đổi

#### 1. File: `src/hooks/useCurrentUser.ts`
- Thêm xử lý `INITIAL_SESSION`: cập nhật cache khi event này fire
- Đảm bảo cache luôn có user ngay khi session được khôi phục

```typescript
if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, session?.user ?? null);
}
```

#### 2. File: `src/components/auth/LawOfLightGuard.tsx`
- **Tách subscription ra khỏi `isAllowed` guard**: Đặt auth listener trong useEffect riêng, luôn active bất kể `isAllowed`. Subscription cần sống suốt vòng đời component.
- **Debounce SIGNED_OUT**: Thêm delay 1.5s trước khi redirect. Nếu `SIGNED_IN` fire trong khoảng đó → hủy redirect. Tránh false logout do token refresh tạm fail.

```text
Trước:
  useEffect (deps: [isAllowed, ...]) {
    if (isAllowed) return;  ← subscription bị cleanup khi allowed
    // create subscription + check
  }

Sau:
  useEffect (deps: []) {          ← subscription luôn active
    // auth listener only
  }
  useEffect (deps: [location]) {  ← profile check
    if (isAllowed) return;
    // check logic
  }
```

### Kết quả
- Không còn bị logout sai do `INITIAL_SESSION` không được xử lý
- Không còn bị kick ra do token refresh tạm fail
- Auth listener luôn active, không bị mất subscription

