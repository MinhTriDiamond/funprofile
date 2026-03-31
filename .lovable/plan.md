

## Sửa lỗi "Không tìm thấy trang cá nhân" khi nhấp vào profile user

### Nguyên nhân

Trong `useProfile.ts`, khi navigate đến `/profile/${userId}`:

1. `useEffect` chạy → `setProfile(null)`, gọi `fetchProfile`
2. `fetchProfile` thành công → `setProfile(data)` → **redirect** sang `/${username}` (dòng 123-125)
3. URL thay đổi → `useEffect` chạy lại → **`setProfile(null)`** (reset lại!) → bắt đầu query mới
4. Đồng thời `currentUserId` thay đổi khi auth load xong → `useEffect` chạy **thêm lần nữa** → `setProfile(null)` thêm lần nữa

Vấn đề: mỗi lần effect re-run đều **reset profile = null** trước khi async query kịp hoàn thành. Các async operation cũ không bị cancel nên chúng tranh nhau set state, dẫn đến race condition.

### Giải pháp

**File `src/hooks/useProfile.ts`** — Thêm cờ `cancelled` vào useEffect để chặn state update từ async cũ:

```tsx
useEffect(() => {
  let cancelled = false;

  setIsOwnProfile(false);
  setProfile(null);
  setLoading(true);

  // ... all async operations check `if (cancelled) return;` before setState
  // e.g.:
  // .then(({ data: profileData }) => {
  //   if (cancelled) return;
  //   ...
  // });

  return () => { cancelled = true; };
}, [navigate, userId, username, fetchProfile, currentUserId]);
```

Cụ thể:
1. Thêm `let cancelled = false;` đầu useEffect
2. Trong callback `.then()` của username flow (dòng 231, 243): thêm `if (cancelled) return;`
3. Trong `fetchProfile` callback (dòng 267): wrap trong check cancelled
4. Thêm cleanup `return () => { cancelled = true; };` cuối useEffect
5. Trong `fetchProfile` (dòng 78-210): KHÔNG redirect ngay lập tức khi `userId` set — thay vào đó, chỉ redirect sau khi đã set profile xong, và dùng `window.history.replaceState` thay vì `navigate` để không trigger re-render/effect

### Thay đổi chi tiết

**Dòng 78-125 (`fetchProfile`):**
- Đổi `navigate(...)` thành `window.history.replaceState(null, '', /${username})` để cập nhật URL mà KHÔNG trigger useEffect lại
- Hoặc: bỏ redirect hoàn toàn khỏi `fetchProfile`, chỉ giữ `setProfile(data)`

**Dòng 212-268 (useEffect):**
- Thêm `let cancelled = false;` + cleanup
- Tất cả `.then()` check `if (cancelled) return;` trước khi `setState`

### File thay đổi
- `src/hooks/useProfile.ts`

### Kết quả
- Nhấp vào profile user → hiển thị trang cá nhân ngay, không còn "Không tìm thấy trang cá nhân"
- URL vẫn được cập nhật sang `/${username}` cho SEO
- Không có race condition giữa nhiều lần effect chạy

