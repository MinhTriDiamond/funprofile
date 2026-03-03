

# Sửa lỗi SSO Flow: Race Condition sau khi Login

## Nguyên nhân gốc

Khi user đăng nhập trên `fun.rich/auth` trong SSO flow, có **2 luồng chạy đồng thời**:

1. `Auth.tsx` `onAuthStateChange` -> gọi `handleSSORedirect()` -> fetch tới `sso-authorize` (bất đồng bộ, mất vài giây)
2. `UnifiedAuthForm.handleAuthSuccess()` -> gọi `navigate('/')` **ngay lập tức**

`navigate('/')` chạy trước khi fetch hoàn tất -> component Auth bị unmount -> fetch bị hủy -> user bị kẹt ở trang chủ FUN Profile thay vì redirect về Angel AI.

## Giải pháp

Truyền trạng thái SSO flow vào `UnifiedAuthForm` để nó **không navigate** khi đang trong SSO mode. Auth.tsx sẽ chịu trách nhiệm redirect.

### Bước 1: Sửa `UnifiedAuthForm` nhận prop `ssoFlow`

Thêm prop `ssoFlow?: boolean` vào `UnifiedAuthForm`. Khi `ssoFlow = true`, `handleAuthSuccess` sẽ **không gọi navigate** mà chỉ hiển thị trạng thái "Đang chuyển hướng..." và để Auth.tsx xử lý redirect.

### Bước 2: Sửa `Auth.tsx` truyền prop `ssoFlow`

```text
<UnifiedAuthForm ssoFlow={ssoFlow && !!returnTo} />
```

### Bước 3: Cải thiện `handleSSORedirect` trong Auth.tsx

Thêm loading state để user biết đang xử lý redirect, và thêm timeout phòng trường hợp fetch thất bại.

---

## Chi tiết kỹ thuật

### File 1: `src/components/auth/UnifiedAuthForm.tsx`

- Thêm interface props: `{ ssoFlow?: boolean }`
- Trong `handleAuthSuccess`: nếu `ssoFlow === true`, chỉ show toast "Đang chuyển hướng về ứng dụng..." và return (không navigate)
- Vẫn chạy các logic khác (log IP, sync law_of_light, PPLP) bình thường

### File 2: `src/pages/Auth.tsx`

- Truyền `ssoFlow={ssoFlow && !!returnTo}` vào `<UnifiedAuthForm />`
- Thêm state `ssoRedirecting` để hiển thị overlay loading khi đang fetch sso-authorize
- Thêm timeout 10s cho fetch, nếu thất bại thì hiển thị lỗi và cho phép user thử lại hoặc về trang chủ

### Luồng đã sửa

```text
User login tren fun.rich/auth (sso_flow=true)
  |
  | 1. onAuthStateChange fires SIGNED_IN
  | 2. Auth.tsx: handleSSORedirect() -> fetch sso-authorize
  |    (hien overlay "Dang chuyen huong...")
  | 3. UnifiedAuthForm.handleAuthSuccess(): thay ssoFlow=true
  |    -> KHONG navigate, chi show toast
  | 4. fetch hoan tat -> window.location.href = redirect_uri
  |
  v
User duoc redirect ve Angel AI callback
```

