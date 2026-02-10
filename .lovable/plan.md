
# BUGFIX: Gửi Token Kẹt "Đang Xử Lý" Trên Mobile

## Nguyên Nhân Gốc

Trong `UnifiedGiftSendDialog.tsx`, flow gửi token:

```text
handleSend()
  -> await sendToken() // co timeout 60s, OK
  -> await recordDonation(hash) // GOI edge function KHONG CO TIMEOUT -> KET
       -> supabase.functions.invoke('record-donation') // hang vinh vien tren mobile
       -> chi khi thanh cong moi: setCelebrationData + setShowCelebration(true)
```

Trên mobile Safari/Chrome, edge function call có thể bị treo do mạng không ổn định. Khi đó:
- `isRecordingDonation = true` khiến nút hiện "Đang xử lý..." mãi
- `handleDialogClose` bị chặn bởi `!isRecordingDonation`
- User không thể đóng dialog, không thấy bảng chúc mừng

## Giải Pháp

### File duy nhất cần sửa: `src/components/donations/UnifiedGiftSendDialog.tsx`

### Thay Doi 1: Tach celebration ra khoi recordDonation

Hien tai, `setCelebrationData` + `setShowCelebration(true)` nam BEN TRONG `recordDonation`, nghia la chi khi edge function thanh cong moi hien celebration. 

**Fix**: Tao celebration data TRUOC khi goi edge function, show celebration NGAY khi co txHash thanh cong, roi goi recordDonation trong background.

### Thay Doi 2: Them timeout cho edge function call

Boc `supabase.functions.invoke('record-donation')` trong timeout 10 giay. Neu timeout/fail:
- Van hien celebration (vi tx da thanh cong on-chain)
- Luu fallback vao localStorage de retry sau
- Hien canh bao nho: "Chua ghi nhan duoc. He thong se tu dong bo."

### Thay Doi 3: Cho phep dong dialog khi dang recording

Sua `handleDialogClose` de cho phep dong dialog ngay ca khi `isRecordingDonation = true` (vi tx da thanh cong, celebration da hien).

### Chi Tiet Code

**A) Sua `handleSend` (dong 311-334):**

```typescript
const handleSend = async () => {
  if (!effectiveRecipientAddress) {
    toast.error('Nguoi nhan chua co vi lien ket');
    return;
  }

  const walletToken = { /* giu nguyen */ };

  const hash = await sendToken({ token: walletToken, recipient: effectiveRecipientAddress, amount });

  if (hash) {
    // TAO celebration data NGAY, KHONG CHO edge function
    const cardData: GiftCardData = {
      id: crypto.randomUUID(),
      amount,
      tokenSymbol: selectedToken.symbol,
      senderUsername: senderProfile?.username || 'Unknown',
      senderAvatarUrl: senderProfile?.avatar_url,
      senderId: /* current user id */,
      senderWalletAddress: address,
      recipientUsername: effectiveRecipient!.username || 'Unknown',
      recipientAvatarUrl: effectiveRecipient!.avatarUrl,
      recipientId: effectiveRecipient!.id,
      recipientWalletAddress: effectiveRecipientAddress,
      message: customMessage,
      txHash: hash,
      lightScoreEarned: Math.floor(parseFloat(amount) / 100),
      createdAt: new Date().toISOString(),
    };

    // HIEN CELEBRATION NGAY
    setCelebrationData(cardData);
    setShowCelebration(true);
    setFlowStep('celebration');

    // GHI DB TRONG BACKGROUND (khong block UI)
    if (effectiveRecipient?.id) {
      recordDonationBackground(hash, cardData);
    }

    onSuccess?.();
  }
};
```

**B) Sua `recordDonation` thanh `recordDonationBackground` (dong 336-386):**

```typescript
const recordDonationBackground = async (hash: string, cardData: GiftCardData) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Timeout 10s cho edge function
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const { data: donationData, error } = await supabase.functions.invoke('record-donation', {
        body: { /* giu nguyen */ },
      });
      clearTimeout(timeoutId);

      if (!error && donationData?.donation?.id) {
        // Cap nhat celebration data voi ID thuc tu DB
        setCelebrationData(prev => prev ? {
          ...prev,
          id: donationData.donation.id,
          lightScoreEarned: donationData.light_score_earned || prev.lightScoreEarned,
        } : prev);
        // Xoa fallback localStorage
        localStorage.removeItem(`pending_donation_${hash}`);
      } else {
        throw new Error(error?.message || 'Record failed');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[GIFT] record-donation failed/timeout:', err);
      // Luu fallback localStorage
      localStorage.setItem(`pending_donation_${hash}`, JSON.stringify({
        txHash: hash,
        recipientId: effectiveRecipient!.id,
        amount, tokenSymbol: selectedToken.symbol,
        message: customMessage,
        timestamp: Date.now(),
      }));
      toast.warning('Chua ghi nhan duoc vao he thong. He thong se tu dong bo.', { duration: 6000 });
    }
  } catch (err) {
    console.error('[GIFT] recordDonationBackground outer error:', err);
  }
  // KHONG set isRecordingDonation vi khong can block UI nua
};
```

**C) Sua `handleDialogClose` (dong 427-429):**

Cho phep dong dialog bat cu luc nao (tru khi dang signing/broadcasting):

```typescript
const handleDialogClose = () => {
  if (txStep === 'signing') return; // chi chan khi dang ky
  onClose();
};
```

**D) Xoa `isRecordingDonation` khoi `isSendDisabled` (dong 439):**

Bo `isRecordingDonation` ra khoi dieu kien disable nut gui vi celebration da hien roi, nut gui khong con hien nua.

**E) Them senderId vao celebration data:**

Lay `session.user.id` tu sender profile fetch (da co san trong useEffect dong 117-129). Them state `senderUserId` de truyen vao `GiftCardData.senderId`.

## Tom Tat

| Thay doi | Muc dich |
|----------|----------|
| Tao celebration TRUOC khi goi edge function | Hien celebration ngay, khong cho DB |
| Goi record-donation trong background | Khong block UI |
| Timeout 10s cho edge function | Tranh treo vinh vien tren mobile |
| localStorage fallback | Dam bao "at least once" logging |
| Cho dong dialog khi recording | User khong bi ket |
| Bo isRecordingDonation khoi isSendDisabled | Khong can thiet nua |

Ket qua: TX thanh cong on-chain -> celebration hien NGAY -> DB ghi nhan trong background (co timeout + fallback).
