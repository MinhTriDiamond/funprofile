

# Cap Nhat He Thong Vi Cho Mint FUN Money

## Van De Hien Tai (NGHIEM TRONG)

Tat ca cac yeu cau mint FUN Money hien tai deu tro ve **cung mot dia chi vi** (`0x44d1a5...243858`) thay vi vi rieng cua tung user. Nguyen nhan:
- Edge function `pplp-mint-fun` truoc day su dung custodial wallet lam fallback
- Nhieu user chua cai dat `public_wallet_address` trong trang ca nhan
- Tinh nang tu dong tao vi F.U. (custodial) khi dang ky lam nhieu user khong chu dong thiet lap vi rieng

## Ke Hoach Sua

### Buoc 1: Cap nhat Edge Function `pplp-mint-fun` - Chi dung `public_wallet_address`
**File**: `supabase/functions/pplp-mint-fun/index.ts`

Thay doi logic chon vi:
- **Bo**: Fallback sang `custodial_wallet_address` va `external_wallet_address`
- **Chi dung**: `public_wallet_address` tu trang ca nhan
- Neu user chua cai vi, tra loi loi yeu cau cai dat vi trong Profile truoc

```typescript
// Truoc (co fallback):
const walletAddress = profile?.public_wallet_address 
  || profile?.custodial_wallet_address 
  || profile?.external_wallet_address;

// Sau (chi public_wallet_address):
const walletAddress = profile?.public_wallet_address;
if (!walletAddress) {
  return error('Vui long cai dat dia chi vi cong khai trong trang ca nhan truoc khi mint');
}
```

### Buoc 2: Go bo tu dong tao vi F.U. Wallet khi dang ky
**File**: `src/components/auth/UnifiedAuthForm.tsx`

Xoa doan code tu dong goi `create-custodial-wallet` trong ham `handleNewUserSetup` (dong 36-53). User se tu thiet lap vi trong Profile khi can.

### Buoc 3: Cap nhat cac mint request cu trong database
Chay SQL update de cap nhat `recipient_address` cho cac request `pending_sig` chua gui on-chain:
- Voi user DA co `public_wallet_address`: cap nhat sang dia chi dung
- Voi user CHUA co `public_wallet_address`: giu nguyen (Admin se tu choi hoac cho user cai vi)

### Tong Ket

| STT | File | Thay doi |
|-----|------|----------|
| 1 | `supabase/functions/pplp-mint-fun/index.ts` | Chi dung public_wallet_address, khong fallback |
| 2 | `src/components/auth/UnifiedAuthForm.tsx` | Go bo tu dong tao custodial wallet |
| 3 | Database SQL | Cap nhat recipient_address cho mint requests cu |

- **2 file sua**
- **1 SQL update**
- **0 file moi**

