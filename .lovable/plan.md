

# Sửa lỗi `client_secret is required` trong `sso-token`

## Nguyên nhân

Dòng 109 trong `sso-token/index.ts`:
```typescript
} else if (client.client_secret && !client_secret) {
  // → Trả về lỗi "client_secret is required"
}
```

Angel AI dùng PKCE flow (gửi `code_verifier` thay vì `client_secret`). Theo chuẩn OAuth 2.0 + PKCE, khi client gửi `code_verifier`, không cần `client_secret` vì PKCE đã chứng minh danh tính client.

## Giải pháp

Sửa logic xác thực client trong `supabase/functions/sso-token/index.ts` (dòng 100-114):

**Trước:**
```typescript
if (client.client_secret && client_secret) {
  // verify bcrypt
} else if (client.client_secret && !client_secret) {
  return error "client_secret is required"  // ← BUG: block PKCE clients
}
```

**Sau:**
```typescript
if (client.client_secret && client_secret) {
  // verify bcrypt - giữ nguyên
} else if (client.client_secret && !client_secret && !code_verifier) {
  // Chỉ yêu cầu client_secret khi KHÔNG có code_verifier (PKCE)
  return error "client_secret is required"
}
```

Chỉ thêm `&& !code_verifier` vào điều kiện dòng 109. Khi có PKCE (`code_verifier`), bỏ qua yêu cầu `client_secret` — PKCE verification ở phía dưới sẽ xử lý.

