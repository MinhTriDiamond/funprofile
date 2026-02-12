

# Cai Dat Vi Chinh De Mint FUN Money

## Van de hien tai
Edge function `pplp-mint-fun` (dong 127-135) chi doc `custodial_wallet_address` va `external_wallet_address` tu profile, KHONG doc `public_wallet_address`. Do do, FUN Money luon duoc mint ve vi custodial thay vi vi ma con muon.

## Ke hoach sua

### Buoc 1: Cap nhat edge function `pplp-mint-fun` de uu tien `public_wallet_address`
Thay doi thu tu uu tien khi doc vi:
1. `public_wallet_address` (uu tien cao nhat - vi nguoi dung tu chon)
2. `custodial_wallet_address` (fallback)
3. `external_wallet_address` (fallback cuoi)

**File**: `supabase/functions/pplp-mint-fun/index.ts` (dong 127-135)

Thay doi tu:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('custodial_wallet_address, external_wallet_address, default_wallet_type')
  .eq('id', userId)
  .single();

const walletAddress = profile?.default_wallet_type === 'external' 
  ? profile?.external_wallet_address 
  : profile?.custodial_wallet_address;
```

Thanh:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('public_wallet_address, custodial_wallet_address, external_wallet_address')
  .eq('id', userId)
  .single();

const walletAddress = profile?.public_wallet_address 
  || profile?.custodial_wallet_address 
  || profile?.external_wallet_address;
```

Logic nay phu hop voi tieu chuan da thiet lap: `public_wallet_address` luon duoc uu tien (xem memory: wallet-address-resolution-logic).

### Buoc 2: Cap nhat 2 mint request cu chua hoan thanh
Cap nhat `recipient_address` cho cac request chua duoc gui on-chain:
- Request `pending_sig` (1,000 FUN): doi vi tu custodial sang `0x44d1a529...8243858`
- Request `signed` (1,000 FUN): doi vi tuong tu (vi chua submit on-chain)

Thuc hien bang SQL update truc tiep trong database.

### Tong ket
- **1 file sua**: `supabase/functions/pplp-mint-fun/index.ts`
- **1 SQL update**: Cap nhat recipient_address cho 2 mint request cu
- **0 file moi**
- Sau khi sua, tat ca FUN Money mint moi se tu dong gui ve vi `0x44d1a52927465d879D4cc4e76189d87Bf8243858`

