

# Sửa lỗi BOOT_ERROR trong `sso-token`: bcryptjs import sai

## Nguyên nhân

Logs cho thấy rõ:
```
The requested module 'npm:bcryptjs@2.4.3' does not provide an export named 'compare'
```

Dòng 2 trong `sso-token/index.ts`:
```typescript
import { compare } from "npm:bcryptjs@2.4.3";  // Named import - KHÔNG hoạt động
```

Package `bcryptjs` chỉ export **default**, không có named exports trong Deno edge runtime.

## Giải pháp

Sửa dòng 2 trong `supabase/functions/sso-token/index.ts`:

```typescript
// Thay:
import { compare } from "npm:bcryptjs@2.4.3";

// Bằng:
import bcrypt from "npm:bcryptjs@2.4.3";
```

Và sửa dòng 102 nơi sử dụng `compare`:

```typescript
// Thay:
const secretValid = await compare(client_secret, client.client_secret);

// Bằng:
const secretValid = await bcrypt.compare(client_secret, client.client_secret);
```

Chỉ sửa 2 dòng, sau đó redeploy `sso-token`.

