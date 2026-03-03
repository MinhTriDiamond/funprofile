
# Sửa lỗi BOOT_ERROR: Biến `supabaseUrl` bị khai báo trùng

## Nguyên nhân
Dòng 43: `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
Dòng 80: `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;` (trùng lặp)

Lỗi: `Uncaught SyntaxError: Identifier 'supabaseUrl' has already been declared at line 88`

## Giải pháp
Xóa dòng 80 (`const supabaseUrl = ...`) vì đã khai báo ở dòng 43. Dòng 81-82 giữ nguyên, chỉ đổi thành dùng `supabaseUrl` đã có:

```typescript
// Dòng 79-82: Thay thế
// Initialize Supabase client
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

Chỉ sửa 1 dòng, xóa khai báo trùng. Sau đó redeploy `sso-authorize`.
