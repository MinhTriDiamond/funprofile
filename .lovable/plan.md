

# Sua loi kiem tra vi khong tim thay dia chi

## Nguyen nhan

Dia chi vi cua nguoi dung `0xb4dda24c245b2bfa85057a4b9559ef48407bafaa` duoc luu trong cot `public_wallet_address`, nhung ham kiem tra trong edge function `sso-web3-auth` (action: 'check') chi tim trong 2 cot:
- `external_wallet_address`
- `wallet_address`

Tuong tu, phan xac thuc dang nhap (phan chinh) cung chi tim trong 2 cot nay.

## Giai phap

Sua edge function `supabase/functions/sso-web3-auth/index.ts` de them kiem tra cot `public_wallet_address` trong ca 2 phan:

### 1. Phan check (action: 'check') -- dong ~80-100

Them truy van thu 3 kiem tra `public_wallet_address` neu 2 truy van dau khong tim thay:

```text
Kiem tra external_wallet_address --> khong thay
  --> Kiem tra wallet_address --> khong thay
    --> Kiem tra public_wallet_address --> tim thay! --> registered: true
```

### 2. Phan xac thuc dang nhap -- dong ~155-185

Tuong tu, them truy van `public_wallet_address` vao luong tim kiem user:

```text
Tim theo external_wallet_address --> khong thay
  --> Tim theo wallet_address --> khong thay
    --> Tim theo public_wallet_address --> tim thay! --> cho dang nhap
```

## Chi tiet ky thuat

### File: `supabase/functions/sso-web3-auth/index.ts`

**Thay doi A -- Phan check:**

Sau khi kiem tra `wallet_address` (byLegacy) ma khong thay, them:

```typescript
const { data: byPublic } = await sb
  .from('profiles')
  .select('id')
  .eq('public_wallet_address', normalizedAddr)
  .maybeSingle();

return new Response(
  JSON.stringify({ registered: !!byPublic }),
  ...
);
```

**Thay doi B -- Phan xac thuc:**

Sau khi kiem tra `wallet_address` (profileByLegacy) ma khong thay, them:

```typescript
const { data: profileByPublic } = await supabase
  .from('profiles')
  .select('id, username, ...')
  .eq('public_wallet_address', normalizedAddress)
  .maybeSingle();

if (profileByPublic) {
  existingProfile = profileByPublic;
}
```

## Ket qua mong doi

Khi nguoi dung dan dia chi vi da luu trong `public_wallet_address`, he thong se nhan ra vi da duoc lien ket va cho phep dang nhap binh thuong.
