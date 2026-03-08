

## Vấn đề

Edge function `sso-web3-auth` trả 401 "Missing authorization header" từ Supabase gateway — không phải từ code function.

Client (`WalletLoginContent.tsx` dòng 57-59) gửi:
```
headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY }
```

Thiếu `Authorization` header → gateway chặn trước khi request đến function code.

**Tài khoản "Minh Trí Test 1" vẫn tồn tại trong DB** — không mất. Server trả `registered: true` khi test trực tiếp với Authorization header đúng.

## Giải pháp

Thay tất cả `fetch()` thủ công trong `WalletLoginContent.tsx` bằng `supabase.functions.invoke()` — tự động gửi đúng headers (apikey + Authorization).

### Thay đổi: `src/components/auth/WalletLoginContent.tsx`

**3 chỗ fetch cần thay:**

1. **Check wallet** (dòng 57-61) → `supabase.functions.invoke('sso-web3-auth', { body: { action: 'check', wallet_address: addr } })`

2. **Challenge** (dòng 89-93) → `supabase.functions.invoke('sso-web3-auth', { body: { action: 'challenge', wallet_address: walletAddr } })`

3. **Verify signature** (dòng 107-116) → `supabase.functions.invoke('sso-web3-auth', { body: { wallet_address, signature, message, nonce } })`

Xóa 2 biến `SUPABASE_URL` và `SUPABASE_KEY` không còn cần thiết (dòng 35-36).

