

# Sửa lỗi khoảng trắng thừa trong Treasury Address

## Nguyên nhân
Secret `TREASURY_WALLET_ADDRESS` được lưu với dấu cách thừa ở đầu: `" 0xd0a262..."` thay vì `"0xd0a262..."`. Khi viem nhận địa chỉ này, nó báo lỗi "invalid address".

## Giải pháp
Sửa file `supabase/functions/claim-reward/index.ts` để `.trim()` cả `treasuryAddress` và `treasuryPrivateKey` ngay khi đọc từ env, tránh lỗi tương tự trong tương lai.

### Thay doi cu the
File: `supabase/functions/claim-reward/index.ts` (khoang dong 240-241)

**Truoc:**
```typescript
const treasuryAddress = Deno.env.get('TREASURY_WALLET_ADDRESS');
const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY');
```

**Sau:**
```typescript
const treasuryAddress = Deno.env.get('TREASURY_WALLET_ADDRESS')?.trim();
const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')?.trim();
```

Sau do redeploy edge function `claim-reward`.

