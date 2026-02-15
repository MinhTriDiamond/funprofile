

## Ke Hoach Hoan Thien He Thong Vi

### Tong quan
Sau khi kiem tra ky, he thong vi da hoat dong tot voi phan lon tinh nang. Con can don dep mot so code cu va bo sung mot vai cai thien nho.

### Ket qua kiem tra CLAIM CAMLY
**DA HOAT DONG DAY DU.** User co the claim CAMLY ve vi khi dat du 5 dieu kien: (1) Ho ten >= 4 ky tu, (2) Anh dai dien, (3) Anh bia, (4) Dang bai hom nay, (5) Ket noi vi. He thong tu dong phat hien gian lan va tam dung tai khoan bat thuong.

### Thay doi can thuc hien

#### 1. Xoa file `WalletHeader.tsx` khong su dung
File nay chua duoc su dung o bat ky dau trong WalletCenterContainer va la phan con lai tu he thong cu.

#### 2. Xoa Valentine Banner da het han
Thay banner "Happy Valentine's Day" trong ClaimRewardsSection bang thong bao trung lap hoac loai bo hoan toan (vi da qua Valentine 2026-02-14).

#### 3. Loai bo custodial type khoi WalletCard
Xoa `walletType: 'custodial'` khoi interface va cac logic kiem tra `isCustodial` trong WalletCard.tsx de phan anh dung viec he thong chi ho tro vi ngoai.

#### 4. Bo sung refresh token balances khi pull-to-refresh
Cap nhat `handlePullRefresh` trong Wallet.tsx de bao gom invalidate `token-balances` query key, dam bao so du token duoc lam moi khi keo xuong.

#### 5. Wallet Settings doc lai gia tri da luu
Cap nhat WalletSettingsDialog de doc `wallet_settings` tu localStorage khi mount, dam bao cai dat duoc giu lai giua cac phien.

#### 6. Cap nhat reward_status sau claim thanh cong
Them logic trong edge function `claim-reward` de update `reward_status = 'claimed'` sau khi giao dich blockchain thanh cong, giup Admin theo doi chinh xac trang thai.

### Chi tiet ky thuat

**Xoa file:**
- `src/components/wallet/WalletHeader.tsx`

**WalletCard.tsx (loai bo custodial):**
- Xoa `walletType: 'custodial' | 'external'` -> chi giu `walletType: 'external'`
- Xoa bien `isCustodial` va cac nhanh logic lien quan
- Xoa import `Shield`, `funProfileLogo`
- Don gian hoa gradient, logo, badge chi cho external wallet

**ClaimRewardsSection.tsx:**
- Xoa khoi Valentine Banner (dong 101-107)

**Wallet.tsx - Pull to refresh:**
```
const handlePullRefresh = useCallback(async () => {
  await queryClient.invalidateQueries({ queryKey: ['fun-balance'] });
  await queryClient.invalidateQueries({ queryKey: ['donation-history'] });
  await queryClient.invalidateQueries({ queryKey: ['light-reputation'] });
  await queryClient.invalidateQueries({ queryKey: ['token-balances'] });
  await queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
}, [queryClient]);
```

**WalletSettingsDialog.tsx - Doc lai localStorage:**
```
// Khi mount, doc lai cai dat da luu
useEffect(() => {
  const saved = localStorage.getItem('wallet_settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    setShowBalance(parsed.showBalance ?? true);
    setCurrency(parsed.currency ?? 'USD');
    setAutoLock(parsed.autoLock ?? false);
    setNotifications(parsed.notifications ?? true);
  }
}, []);
```

**claim-reward/index.ts - Cap nhat status sau claim:**
```
// Sau buoc 15 (ghi reward_claims), them:
await supabaseAdmin.from('profiles').update({
  reward_status: 'claimed',
}).eq('id', userId);
```

### Ket qua
- Code sach hon, khong con tham chieu den vi luu ky
- Pull-to-refresh lam moi toan bo du lieu vi
- Cai dat vi duoc luu tru va phuc hoi dung
- Trang thai claim duoc dong bo chinh xac
- Giao dien khong con banner het han

