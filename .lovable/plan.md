

# Fix: Kich hoat tinh nang Crypto Gift trong Chat

## Nguyen nhan hien tai khong hoat dong

Co 3 van de can sua:

### Van de 1: `SendCryptoModal` la placeholder
File `src/modules/chat/components/SendCryptoModal.tsx` chi la mot dialog don gian voi dong text "Tinh nang tang crypto dang duoc phat trien". Trong khi do, `UnifiedGiftSendDialog` (da co san, hoat dong tot) la dialog tang qua day du voi chon token, ket noi vi, tim nguoi nhan - dung nhu hinh anh con gui.

### Van de 2: Truy van thieu truong `public_wallet_address`
Trong `useConversation` (file `src/modules/chat/hooks/useConversations.ts`), truy van profiles chi lay: `id, username, avatar_url, full_name, external_wallet_address, custodial_wallet_address, wallet_address`. **Thieu `public_wallet_address`** - day la truong uu tien cao nhat theo quy tac cua he thong.

### Van de 3: `MessageThread` doc sai truong vi
File `src/modules/chat/components/MessageThread.tsx` dong 127 doc `headerProfile?.wallet_address` thay vi uu tien `public_wallet_address > external_wallet_address > wallet_address > custodial_wallet_address`.

## Ke hoach sua

### Buoc 1: Sua `src/modules/chat/hooks/useConversations.ts`
Them `public_wallet_address` vao cau truy van profiles:

```text
// Dong 278 - them public_wallet_address
.select('id, username, avatar_url, full_name, public_wallet_address, external_wallet_address, custodial_wallet_address, wallet_address')
```

### Buoc 2: Sua `src/modules/chat/components/MessageThread.tsx`
Cap nhat dong 127 de uu tien dung thu tu dia chi vi:

```text
// Truoc:
const recipientWalletAddress = !isGroup ? headerProfile?.wallet_address || null : null;

// Sau:
const recipientWalletAddress = !isGroup 
  ? (headerProfile?.public_wallet_address 
    || headerProfile?.external_wallet_address 
    || headerProfile?.wallet_address 
    || headerProfile?.custodial_wallet_address 
    || null) 
  : null;
```

### Buoc 3: Sua `src/modules/chat/components/ChatInput.tsx`
Thay the `SendCryptoModal` bang `UnifiedGiftSendDialog`:

- Xoa import `SendCryptoModal`
- Them import `UnifiedGiftSendDialog` tu `@/components/donations/UnifiedGiftSendDialog`
- Thay doi phan render tu `SendCryptoModal` thanh `UnifiedGiftSendDialog` voi cac props tuong ung:
  - `isOpen={showCryptoModal}`
  - `onClose={() => setShowCryptoModal(false)}`
  - `mode="wallet"`
  - `presetRecipient` voi thong tin nguoi nhan (userId, username, walletAddress)

### Buoc 4: Dieu kien hien thi nut Crypto Gift
Nut "Crypto Gift" trong attach menu chi hien khi KHONG phai group chat. Neu nguoi nhan chua co vi, se hien thong bao "Nguoi dung chua cap nhat vi Web3". Logic nay da co san va dung.

## Tong ket thay doi

| File | Thay doi |
|------|---------|
| `src/modules/chat/hooks/useConversations.ts` | Them `public_wallet_address` vao select |
| `src/modules/chat/components/MessageThread.tsx` | Uu tien dia chi vi dung thu tu |
| `src/modules/chat/components/ChatInput.tsx` | Thay `SendCryptoModal` bang `UnifiedGiftSendDialog` |

Khong can tao file moi. Chi can noi ket cac thanh phan da co san.

