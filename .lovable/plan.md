

# Sửa lỗi SSO: `req.url` nội bộ trong `sso-authorize`

## Nguyên nhân gốc

Trong Supabase Edge Functions, `req.url` trả về URL **nội bộ** (ví dụ `http://localhost:8000/sso-authorize?...`), KHÔNG phải URL bên ngoài (`https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-authorize?...`).

Dòng 111 trong `sso-authorize/index.ts`:
```
loginUrl.searchParams.set('return_to', req.url);
```

Điều này khiến `return_to` chứa URL localhost. Khi Auth.tsx cố fetch URL này từ browser, fetch thất bại → catch block chạy `navigate('/')` → user bị đưa về trang chủ FUN Profile.

## Giải pháp

### Sửa `supabase/functions/sso-authorize/index.ts`

**Thay đổi 1**: Xây dựng URL bên ngoài từ `SUPABASE_URL` thay vì dùng `req.url`:

```typescript
// Dòng ~38-40: Sau khi parse req.url
const url = new URL(req.url);
const params = url.searchParams;

// Thêm: Xây dựng external URL
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const externalUrl = `${supabaseUrl}/functions/v1/sso-authorize?${params.toString()}`;
```

**Thay đổi 2**: Dòng 111, thay `req.url` bằng `externalUrl`:

```typescript
loginUrl.searchParams.set('return_to', externalUrl);  // thay vì req.url
```

**Thay đổi 3**: Cập nhật CORS headers cho đầy đủ (thêm các header Supabase client gửi):

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

**Thay đổi 4**: Thêm console.log để debug (tạm thời):

```typescript
console.log('SSO Authorize called, external URL:', externalUrl);
console.log('Auth header present:', !!authHeader);
```

### Tổng kết

Chỉ sửa 1 file: `supabase/functions/sso-authorize/index.ts`. Không thay đổi file client nào.

