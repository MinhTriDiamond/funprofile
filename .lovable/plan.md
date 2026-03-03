

# Phân tích lỗi "No email in FUN Profile identity" và hướng sửa

## Lỗi là gì?

Sau khi user đăng nhập FUN Profile và được redirect về Angel AI, Angel AI nhận được token response từ `sso-token` endpoint. Response này chứa object `user` nhưng **thiếu trường `email`**:

```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid-xxx",
    "fun_id": "username123",
    "username": "Username123",
    "full_name": "Tên người dùng",
    "avatar_url": "https://..."
  }
}
```

Angel AI cần `email` để tạo/liên kết tài khoản nội bộ → không có email → báo lỗi **"No email in FUN Profile identity"**.

## Tại sao thiếu email?

Bảng `profiles` trong FUN Profile **không lưu email** — email nằm trong bảng `auth.users` (bảng hệ thống). Code hiện tại chỉ query `profiles`:

```typescript
// Dòng 178-182 trong sso-token/index.ts
const { data: profile } = await supabase
  .from('profiles')
  .select('id, username, full_name, avatar_url, fun_id, custodial_wallet_address')
  .eq('id', authCode.user_id)
  .single();
```

Và response trả về (dòng 237-243) không có `email`.

---

## FUN Profile cần sửa gì?

Sửa **1 file duy nhất**: `supabase/functions/sso-token/index.ts`

### Bước 1: Lấy email từ auth.users (thêm sau dòng 182)
```typescript
// Dùng Admin API để lấy email từ auth.users
const { data: { user: authUser } } = await supabase.auth.admin.getUserById(authCode.user_id);
```

### Bước 2: Thêm email vào response (sửa dòng 237-243)
```typescript
user: profile ? {
  id: profile.id,
  fun_id: profile.fun_id,
  username: profile.username,
  full_name: profile.full_name,
  avatar_url: profile.avatar_url,
  email: authUser?.email || null   // ← THÊM DÒNG NÀY
} : null
```

Sau đó redeploy `sso-token`.

---

## Angel AI cần sửa gì?

**Không cần sửa gì** — Angel AI đã có logic đọc `email` từ response, chỉ là FUN Profile chưa gửi nó. Sau khi FUN Profile thêm `email` vào response, Angel AI sẽ hoạt động bình thường.

*(Nếu Angel AI muốn an toàn hơn, có thể thêm fallback: dùng `fun_id@fun.rich` làm email tạm khi không có email thật — nhưng đây là phía Angel AI tự quyết định, FUN Profile không cần quan tâm.)*

---

## Tóm tắt

| Phía | Cần sửa? | Chi tiết |
|------|----------|----------|
| **FUN Profile** | ✅ Có | Thêm 2 dòng code trong `sso-token`: lấy email từ `auth.users` và trả về trong response |
| **Angel AI** | ❌ Không | Đã có sẵn logic đọc email, chỉ cần FUN Profile gửi đúng |

