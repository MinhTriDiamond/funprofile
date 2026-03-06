

## Kế hoạch sửa flow "Quên mật khẩu / Reset Password"

### Root Cause

1. **`redirectTo` sai** — `ClassicEmailLogin.tsx` dòng 147 redirect về `/auth` thay vì route reset password
2. **`Auth.tsx` không xử lý `PASSWORD_RECOVERY`** — `onAuthStateChange` chỉ check `SIGNED_IN`, coi recovery session như login bình thường → redirect homepage
3. **Không có trang `/reset-password`** — chỉ có `/set-password` (dùng cho SSO flow, dùng edge function + token query param, không phù hợp cho recovery flow)

### Các thay đổi

#### 1. Tạo `src/pages/ResetPassword.tsx`

Trang mới cho flow recovery, bao gồm:
- Kiểm tra recovery context khi mount (check session có `type=recovery` hoặc URL hash chứa `type=recovery`)
- Nếu không hợp lệ: hiện thông báo "Liên kết không hợp lệ hoặc đã hết hạn" + nút quay lại `/auth`
- Nếu hợp lệ: form gồm **mật khẩu mới** + **xác nhận mật khẩu**, show/hide toggle
- Validation: tối thiểu 6 ký tự, 2 trường khớp nhau
- Submit: `supabase.auth.updateUser({ password })` 
- Thành công: toast → `supabase.auth.signOut()` → redirect `/auth` sau 2s
- Lỗi: hiện error message rõ ràng (token hết hạn, link đã dùng...)
- UI theo phong cách FUN Ecosystem (green theme, hologram border) đồng bộ với `/auth`

#### 2. Sửa `src/components/auth/ClassicEmailLogin.tsx` (dòng 147)

```
redirectTo: `${window.location.origin}/auth`
→
redirectTo: `${window.location.origin}/reset-password`
```

#### 3. Sửa `src/pages/Auth.tsx`

- Trong `onAuthStateChange`: thêm check `event === 'PASSWORD_RECOVERY'` → `navigate('/reset-password')` và `return` trước khi xử lý `SIGNED_IN`
- Trong `checkUser`: kiểm tra URL hash có chứa `type=recovery` → nếu có, không redirect về `/`

#### 4. Thêm route trong `src/App.tsx`

```tsx
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// ...
<Route path="/reset-password" element={<ResetPassword />} />
```

#### 5. Cập nhật `src/components/auth/LawOfLightGuard.tsx`

Thêm `/reset-password` vào `publicPaths`:
```ts
const publicPaths = ['/law-of-light', '/docs', '/auth', '/reset-password'];
```

### Flow hoàn chỉnh sau khi fix

```text
User bấm "Quên mật khẩu" ở /auth
  → resetPasswordForEmail gửi email với redirectTo = /reset-password
  → User click link trong email
  → Supabase verify token, tạo recovery session
  → Redirect về /reset-password#access_token=...&type=recovery
  → Auth.tsx onAuthStateChange nhận PASSWORD_RECOVERY → navigate('/reset-password')
  → ResetPassword page kiểm tra recovery context → hiện form
  → User nhập mật khẩu mới + xác nhận
  → Submit → updateUser({ password })
  → Toast thành công → signOut() → redirect /auth
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/ResetPassword.tsx` | Tạo mới |
| `src/components/auth/ClassicEmailLogin.tsx` | Sửa `redirectTo` |
| `src/pages/Auth.tsx` | Thêm xử lý `PASSWORD_RECOVERY` |
| `src/App.tsx` | Thêm route + lazy import |
| `src/components/auth/LawOfLightGuard.tsx` | Thêm public path |

