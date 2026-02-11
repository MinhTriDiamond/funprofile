

# Sửa 3 tính năng bị kẹt: Post Video, Orphan Cleanup, Stream Migration

## Nguyên nhân chung

Cả 3 tính năng đều bị kẹt vì cùng 2 vấn đề:

1. **`verify_jwt = true` trong config.toml**: Lovable Cloud sử dụng ES256 signing keys, khiến hệ thống gateway không xác thực được JWT trước khi request đến edge function. Request bị reject ngay tại gateway, function code không bao giờ chạy.

2. **Sử dụng `getUser()` thay vì `getClaims()`**: Theo quy tắc của dự án, edge functions phải dùng `getClaims(token)` để xác thực vì `getUser()` có thể thất bại với ES256 tokens.

## Chi tiết thay đổi

### 1. File: `supabase/config.toml`

Chuyển 2 function sang `verify_jwt = false`:

```
[functions.cleanup-orphan-videos]
verify_jwt = false

[functions.migrate-stream-to-r2]
verify_jwt = false
```

### 2. File: `supabase/functions/cleanup-orphan-videos/index.ts`

Thay thế xác thực `getUser()` bằng `getClaims()`:

```typescript
// BEFORE (line 205):
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// AFTER:
const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
if (authError || !claimsData?.claims) {
  throw new Error('Unauthorized');
}
const userId = claimsData.claims.sub;
```

Sau đó thay `user.id` bằng `userId` khi kiểm tra admin role.

### 3. File: `supabase/functions/migrate-stream-to-r2/index.ts`

Thay thế xác thực `getUser()` bằng `getClaims()`:

```typescript
// BEFORE (lines 38-49):
const supabaseUser = createClient(...);
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

// AFTER: Dùng supabaseAdmin + getClaims
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
const userId = claimsData.claims.sub;
```

Xoa bo `supabaseUser` client (khong can thiet nua), dung `userId` thay cho `user.id`.

### 4. File: `supabase/functions/create-post/index.ts`

Thay the `getUser()` bang `getClaims()` de fix loi "Dang xac thuc..." khi post video:

```typescript
// BEFORE (line 72):
const { data: { user }, error: userError } = await supabase.auth.getUser();

// AFTER:
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}
const userId = claimsData.claims.sub;
```

## Danh sach file thay doi

| File | Hanh dong | Mo ta |
|------|-----------|-------|
| `supabase/config.toml` | Sua | `verify_jwt = false` cho cleanup-orphan-videos va migrate-stream-to-r2 |
| `supabase/functions/cleanup-orphan-videos/index.ts` | Sua | Doi `getUser()` -> `getClaims()` |
| `supabase/functions/migrate-stream-to-r2/index.ts` | Sua | Xoa `supabaseUser`, doi `getUser()` -> `getClaims()` |
| `supabase/functions/create-post/index.ts` | Sua | Doi `getUser()` -> `getClaims()` |

## Ket qua mong doi

- Post video: khong con ket o "Dang xac thuc...", xac thuc nhanh va dang bai thanh cong
- Orphan cleanup: quet duoc tat ca 165 video tren Cloudflare Stream
- Stream migration: dry run va migration deu hoat dong binh thuong

