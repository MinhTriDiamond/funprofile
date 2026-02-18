
# Kế hoạch: Sửa 3 vấn đề — Van103, Link fun.rich, & Đăng xuất tự động

## Phân tích vấn đề

### 1. Vẫn hiển thị "Van103" trong hình ảnh tặng tiền (GiftCelebrationCard)

Nhìn vào code hiện tại của `GiftCelebrationCard.tsx`:
- Dòng 263 hiển thị avatar sender: `{senderUsername[0]?.toUpperCase()}` — dùng `username` (van103) cho `AvatarFallback`, không dùng `display_name`
- Dòng 264: `<span>...{senderDisplayName}</span>` — đã đúng (dùng display_name)

Vấn đề thực sự: Khi `post.profiles.display_name` là `null` hoặc chưa được đưa vào `GiftCelebrationCard` từ Feed, component fallback về `username`. Cần kiểm tra xem `posts` query trong `useFeedPosts` có thực sự join `display_name` không — code hiện tại ở dòng 101 và 129 query `profiles!posts_user_id_fkey (username, display_name, avatar_url, ...)` — ĐÃ ĐÚNG.

Root cause thực sự: Trong `GiftCelebrationCardComponent`, biến `senderUsername` (dòng 204) dùng `actualSenderProfile?.username` thay vì `display_name`. Dòng `AvatarFallback` ở dòng 261 dùng `senderUsername[0]` — hiển thị chữ cái đầu của username, KHÔNG phải display_name. Đặc biệt khi render caption dưới avatar, **dòng 264 dùng `senderDisplayName`** — đúng. Nhưng avatar fallback vẫn lấy từ username.

Thực ra vấn đề sâu hơn: Trong `DonationHistoryItem.tsx`, dòng 39 và 43 đã được sửa đúng. Nhưng trong `GiftCelebrationCard` dòng 261, `AvatarFallback` dùng `senderUsername[0]` — có nghĩa là chữ cái hiển thị trong avatar vẫn là "V" (từ "van103"), không phải "A" (từ "Angel Ái Vân").

### 2. Link fun.rich vẫn ra Lovable

Đây là vấn đề về **Supabase Auth Redirect URL** configuration. Khi user click link `https://fun.rich/...`, domain `fun.rich` cần được cấu hình là `Site URL` trong Supabase Auth settings, và `https://fun.rich/**` phải có trong redirect URLs. Nếu chưa cấu hình, Supabase sẽ redirect về domain mặc định (lovable.app).

Ngoài ra, link chia sẻ ở `GiftCelebrationCard.tsx` dòng 359 dùng:
```js
window.location.origin + '/post/' + post.id
```
Nếu người dùng đang trên lovable.app thì link sẽ trỏ về lovable.app.

Cần sửa link chia sẻ để luôn dùng `https://fun.rich/post/${post.id}` — đây là domain production chính thức.

### 3. Đăng nhập xong bị đăng xuất sau một lúc

Đây là vấn đề race condition trong `onAuthStateChange`. Cụ thể:
- **`FacebookNavbar.tsx` (dòng 85-106)**: `onAuthStateChange` gọi `await supabase.from('profiles').select(...)` và `await supabase.rpc('has_role', ...)` **bên trong callback** → deadlock, vì Supabase chưa hoàn thành auth cycle trước khi callback return
- **`LawOfLightGuard.tsx` (dòng 105-111)**: `onAuthStateChange` gọi lại `checkLawOfLightAcceptance()` khi SIGNED_IN — hàm này gọi `await supabase.auth.getSession()` bên trong listener → gây deadlock
- Kết quả: Supabase hiểu là session bị hỏng và tự đăng xuất

Cách sửa chuẩn: Dùng `setTimeout(..., 0)` để thoát khỏi callback trước khi thực hiện async operations.

---

## Các thay đổi cụ thể

### File 1: `src/components/feed/GiftCelebrationCard.tsx`
- **Avatar fallback**: Sửa dòng 261 từ `senderUsername[0]` → `senderDisplayName[0]`  
- **Link chia sẻ**: Sửa dòng 359 từ `window.location.origin + '/post/' + post.id` → `https://fun.rich/post/${post.id}` để link luôn trỏ về production domain

### File 2: `src/components/layout/FacebookNavbar.tsx`
Sửa `onAuthStateChange` để tránh deadlock — không gọi async Supabase bên trong callback trực tiếp:

```typescript
// TRƯỚC (lỗi - gây deadlock):
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  setIsLoggedIn(!!session);
  if (session) {
    const { data } = await supabase.from('profiles').select(...); // ← DEADLOCK
    ...
  }
});

// SAU (đúng - dùng setTimeout để thoát khỏi callback cycle):
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  setIsLoggedIn(!!session);
  if (session) {
    setCurrentUserId(session.user.id);
    // Defer async calls to avoid deadlock
    setTimeout(async () => {
      const { data } = await supabase.from('profiles').select(...);
      if (data) setProfile(data);
      const { data: hasAdminRole } = await supabase.rpc('has_role', {...});
      setIsAdmin(!!hasAdminRole);
    }, 0);
  } else {
    setProfile(null);
    setCurrentUserId(null);
    setIsAdmin(false);
  }
});
```

### File 3: `src/components/auth/LawOfLightGuard.tsx`
`onAuthStateChange` đang gọi lại `checkLawOfLightAcceptance()` bên trong callback (đã có `setTimeout(..., 0)` nhưng hàm đó vẫn gọi `await supabase.auth.getSession()` ngay). Cần đảm bảo event `SIGNED_IN` chỉ set `isAllowed = true` thay vì gọi lại toàn bộ function check:

```typescript
// SAU (đúng):
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Only re-check if currently blocked (not allowed)
    setTimeout(() => {
      checkLawOfLightAcceptance();
    }, 100); // Slight delay to ensure auth state is stable
  }
  // SIGNED_OUT is handled by checkLawOfLightAcceptance on re-render
});
```

### File 4: `src/pages/Feed.tsx`
`onAuthStateChange` ở Feed (dòng 92-98) đã tốt — chỉ set state đơn giản, không await. Không cần sửa.

### File 5: Các link chia sẻ trong `FacebookPostCard.tsx`
Cần kiểm tra và sửa link chia sẻ post cũng dùng `https://fun.rich/post/${post.id}` thay vì `window.location.origin`.

---

## Tóm tắt files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/feed/GiftCelebrationCard.tsx` | Sửa avatar fallback dùng `display_name`; sửa link chia sẻ → `fun.rich` |
| `src/components/layout/FacebookNavbar.tsx` | Sửa `onAuthStateChange` — defer async calls bằng `setTimeout(0)` |
| `src/components/auth/LawOfLightGuard.tsx` | Tinh chỉnh `onAuthStateChange` để tránh gọi lại toàn bộ check khi không cần |
| `src/components/feed/FacebookPostCard.tsx` | Sửa link chia sẻ → `fun.rich` |

---

## Ghi chú kỹ thuật

- **fun.rich redirect**: Vấn đề link fun.rich trỏ về lovable là do Supabase `Site URL` chưa được đặt là `https://fun.rich`. Điều này cần cấu hình trong Supabase Auth Settings. Việc sửa link chia sẻ trong code giúp các link copy/share luôn đúng, nhưng OAuth redirect về fun.rich là cấu hình phía backend.
- **Deadlock pattern**: Gọi `await supabase.*` bên trong `onAuthStateChange` callback trực tiếp (không qua `setTimeout`) gây deadlock vì Supabase JS client chờ callback hoàn tất trước khi xử lý token refresh, dẫn đến timeout và auto-logout.
- Không cần migration database.
