
## Sua loi tang tien bi treo va claim tien chua nhan

### Van de 1: Tang tien (Gift) bi treo o "Dang ghi nhan vao he thong..."

**Nguyen nhan goc**: Trong `useSendToken.ts`, ham `sendToken` la mot async function **chan toan bo luong** (blocking):

```text
1. MetaMask duyet → txHash co ngay (line 128: setTxHash(hash))
2. Cho receipt tu blockchain (len toi 60 giay)     ← TREO O DAY
3. Ghi DB (len toi 8 giay)
4. Moi return hash ve cho caller
```

Trong `UnifiedGiftSendDialog`, `handleSend` goi `const hash = await sendToken(...)` va CHI hien celebration SAU KHI `sendToken` return. Nghia la du MetaMask da duyet, UI van phai cho toi 68 giay moi hien the chuc mung.

**Giai phap**: Thay vi cho `sendToken` return hash, dialog se **theo doi state `txHash`** (duoc set ngay khi MetaMask duyet) va tu dong chuyen sang celebration ngay lap tuc.

### Van de 2: Claim tien chua nhan duoc

**Kiem tra log**: Edge function `claim-reward` ghi nhan thanh cong (tx confirmed on block 81294247). Nghia la tien DA duoc gui len blockchain thanh cong. Nguyen nhan co the la nguoi dung chua them token CAMLY vao MetaMask de hien thi so du. Se bo sung huong dan them token CAMLY ngay sau khi claim thanh cong.

### Thay doi cu the

#### 1. `src/components/donations/UnifiedGiftSendDialog.tsx`

- Them `useEffect` theo doi `txHash` tu `useSendToken`:
  - Khi `txHash` thay doi tu null sang co gia tri VA `flowStep === 'confirm'` → tu dong tao celebrationData va chuyen sang flowStep `'celebration'` ngay lap tuc
  - Khong con cho `sendToken` return hash
- Sua `handleSend` thanh "fire and forget": goi `sendToken` nhung KHONG await ket qua. Celebration duoc trigger boi useEffect o tren
- Ghi nhan donation vao DB van chay background nhu cu (recordDonationBackground)

Logic moi:
```typescript
// useEffect theo doi txHash
useEffect(() => {
  if (txHash && flowStep === 'confirm' && effectiveRecipient && senderProfile) {
    // Tao celebration data ngay
    const cardData = { ... };
    setCelebrationData(cardData);
    setShowCelebration(true);
    setFlowStep('celebration');
    
    // Record DB in background
    recordDonationBackground(txHash, cardData);
    onSuccess?.();
  }
}, [txHash]);

// handleSend khong con await ket qua
const handleSend = async () => {
  sendToken({ token, recipient, amount }); // fire & forget
};
```

#### 2. `src/hooks/useSendToken.ts`

- Tach rieng buoc receipt va DB insert thanh background tasks sau khi co txHash
- Return hash NGAY sau khi MetaMask duyet (khong cho receipt)
- Receipt polling va DB insert van chay nhung khong block return

Logic moi:
```typescript
// Sau khi co hash tu MetaMask:
setTxHash(hash);
setTxStep('broadcasted');

// Return hash NGAY - khong cho receipt
// Receipt + DB insert chay background
backgroundFinalize(hash, receiptOk); 
return hash;
```

#### 3. `src/components/wallet/ClaimRewardDialog.tsx` (hoac component tuong ung)

- Sau khi claim thanh cong, hien thi huong dan them token CAMLY vao MetaMask:
  - Contract: `0x0910320181889feFDE0BB1Ca63962b0A8882e413`
  - Symbol: CAMLY
  - Decimals: 3
- Them nut "Them CAMLY vao vi" su dung `wallet_watchAsset` API cua MetaMask

#### 4. Don dep `custodial_wallet_address` con sot

- Trong `UnifiedGiftSendDialog.tsx` line 200 va 235: van select va search `custodial_wallet_address` - can xoa
- Trong `resolveWalletAddress` (line 190-192): van fallback qua `custodial_wallet_address` - can xoa

### Ket qua

- Gift: Celebration hien ngay khi MetaMask duyet (khong cho 60-68 giay)
- Gift: Receipt polling va DB insert van chay background, khong anh huong UX
- Claim: Nguoi dung duoc huong dan them token CAMLY vao MetaMask de thay so du
- Code sach hon: khong con tham chieu den custodial_wallet_address
