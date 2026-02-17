

# Fix: Wallet address persistence and profile links

## 3 van de can sua

### 1. public_wallet_address bi ghi de moi khi dang nhap/ket noi vi
**Nguyen nhan:** Ca 2 edge functions deu tu dong ghi `public_wallet_address = normalizedAddress` moi lan:
- `connect-external-wallet` (dong 143): Luon ghi de
- `sso-web3-auth` (dong 145, 202): Luon ghi de khi legacy migration va new user

**Giai phap:** 
- `public_wallet_address` mac dinh de trong (null) cho user moi
- Chi ghi `public_wallet_address` khi user **chua co** (null/empty)
- Khi user da co roi, **khong ghi de** - chi cap nhat khi user chu dong thay doi

### 2. Profile links tro ve domain Lovable thay vi fun.rich
**Nguyen nhan:** `href={/username}` la duong dan tuong doi, tro ve domain hien tai
**Giai phap:** Doi thanh `https://fun.rich/${username}`

### 3. User moi dang ky bang Web3 khong nen tu dong set public_wallet_address
**Giai phap:** User moi chi luu `external_wallet_address` va `wallet_address`, de `public_wallet_address` = null cho den khi user tu ket noi vi

---

## Chi tiet ky thuat

### File 1: `supabase/functions/connect-external-wallet/index.ts`
- Dong 136-145: Truoc khi update, kiem tra `public_wallet_address` hien tai
- Neu da co gia tri -> chi update `external_wallet_address` va `wallet_address`, KHONG ghi de `public_wallet_address`
- Neu chua co (null/empty) -> ghi `public_wallet_address` = normalizedAddress

```typescript
// Fetch current profile to check existing public_wallet_address
const { data: currentProfile } = await supabase
  .from('profiles')
  .select('public_wallet_address')
  .eq('id', user.id)
  .single();

const updateData: Record<string, string> = {
  external_wallet_address: normalizedAddress,
  wallet_address: normalizedAddress,
};

// Only set public_wallet_address if user doesn't have one yet
if (!currentProfile?.public_wallet_address) {
  updateData.public_wallet_address = normalizedAddress;
}
```

### File 2: `supabase/functions/sso-web3-auth/index.ts`
- **Legacy migration (dong 140-148):** Chi update `public_wallet_address` neu chua co

```typescript
const legacyUpdate: Record<string, string> = {
  external_wallet_address: normalizedAddress,
  default_wallet_type: 'external',
};
if (!profileByLegacy.public_wallet_address) {
  legacyUpdate.public_wallet_address = normalizedAddress;
}
```

- **New user (dong 196-208):** Bo `public_wallet_address` khoi update - de null mac dinh, user se tu ket noi sau

```typescript
// Remove public_wallet_address from new user setup
await supabase.from('profiles').update({
  external_wallet_address: normalizedAddress,
  wallet_address: normalizedAddress,
  default_wallet_type: 'external',
  registered_from: 'FUN Profile',
  oauth_provider: 'Wallet',
  last_login_platform: 'FUN Profile'
  // NO public_wallet_address - user will connect manually
}).eq('id', userId);
```

### File 3: `src/pages/Profile.tsx`
- Dong 468: `href={/${profile?.username}}` -> `href={https://fun.rich/${profile?.username}}`

### File 4: `src/components/profile/EditProfile.tsx`
- Dong 360: `href={/${username || 'username'}}` -> `href={https://fun.rich/${username || 'username'}}`
- Dong 416: Tuong tu

---

## Ket qua mong doi
- User moi: `public_wallet_address` = null (trong)
- Khi user ket noi vi lan dau: `public_wallet_address` duoc set
- Khi user dang nhap lai hoac ket noi vi khac: `public_wallet_address` KHONG bi ghi de
- Link ho so luon tro den `https://fun.rich/username`

