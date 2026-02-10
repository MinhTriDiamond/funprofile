
# Xoá Tính Năng Auto-Link Ví Vào Profile Trên /wallet

## Tổng Quan

Tách bạch hoàn toàn 2 khái niệm:
- **Wallet session** (wagmi address): dùng để giao dịch, xem số dư -- chỉ tồn tại trong phiên
- **Public wallet address** (public_wallet_address): thông tin công khai do user tự khai báo trên /profile

/wallet sẽ KHÔNG còn ghi bất kỳ thứ gì vào DB profile liên quan đến ví.

## Danh Sách Thay Đổi

### 1. `src/components/wallet/WalletCenterContainer.tsx` -- Xoá auto-link logic

Xoá/loại bỏ:
- State: `isLinkingWallet`, `isUnlinkingWallet`, `autoLinkTriggeredRef`
- Import `useSignMessage` (nếu chỉ dùng cho link)
- Hàm `linkWalletToProfile()` (dòng 358-402)
- useEffect auto-link (dòng 405-432)
- Hàm `unlinkWalletFromProfile()` (dòng 435-460)
- Xoá các prop `onLink`, `onUnlink`, `isLinkingWallet`, `isUnlinkingWallet`, `isLinkedToProfile` khi truyền vào `WalletCard` (dòng 602-609)
- Interface `WalletProfile` không cần `external_wallet_address` nữa (nhưng giữ fetch nếu cần cho ReceiveTab fallback)

Giữ nguyên:
- `handleConnect`, `handleDisconnect` (session only)
- Toàn bộ logic balance, reward, send, receive
- `walletProfile` fetch (vẫn cần `custodial_wallet_address` cho một số fallback)

### 2. `src/components/wallet/WalletCard.tsx` -- Xoá UI Link/Unlink

Xoá khỏi interface và component:
- Props: `isLinkedToProfile`, `onLink`, `onUnlink`, `isLinkingWallet`, `isUnlinkingWallet`
- Badge hiển thị "Linked" / "Connected" -- chỉ giữ "Connected" / "Not Connected"
- Block nút "Liên kết ví" và "Hủy liên kết" (khu vực Link/Unlink buttons)

Giữ nguyên:
- Connect / Disconnect / Switch Account / Send / Receive / Swap / Buy

### 3. `src/pages/Profile.tsx` -- Bỏ fallback external_wallet_address

Dòng 466: thay
```
public_wallet_address || external_wallet_address || custodial_wallet_address
```
thành
```
public_wallet_address || custodial_wallet_address
```

Không còn hiển thị `external_wallet_address` trên profile.

### 4. `src/components/profile/EditProfile.tsx` -- Bỏ prefill từ external

Dòng 71: thay
```
data.public_wallet_address || data.external_wallet_address || ''
```
thành
```
data.public_wallet_address || ''
```

### 5. `src/components/wallet/WalletManagement.tsx` -- Xoá logic connect-external-wallet

Hàm `handleConnectExternalWallet` gọi Edge Function `connect-external-wallet` để lưu ví vào DB. Xoá hoàn toàn hàm này và nút "Kết nối MetaMask" trong card External Wallet.

Component này chủ yếu phục vụ profile-link, nên sẽ đơn giản hoá hoặc loại bỏ phần External Wallet card (chỉ giữ Custodial card nếu cần).

### 6. `src/components/wallet/WalletSettingsDialog.tsx` -- Cập nhật tương ứng

Nếu `WalletManagement` được đơn giản hoá, dialog này cũng cần cập nhật cho phù hợp.

### 7. Edge Functions -- Không xoá file, chỉ ngưng gọi

- `connect-external-wallet` và `disconnect-external-wallet`: giữ file (có thể cần cho web3 auth flow khác), nhưng frontend KHÔNG còn gọi nữa.
- Không cần xoá file vì chúng có thể phục vụ `sso-web3-auth` (tạo user mới qua wallet login vẫn dùng `external_wallet_address`).

## Tóm Tắt Files

| File | Hành động | Mô tả |
|------|-----------|-------|
| `WalletCenterContainer.tsx` | Sửa lớn | Xoá auto-link, linkWallet, unlinkWallet, useEffect |
| `WalletCard.tsx` | Sửa | Xoá props/UI link-unlink, chỉ giữ session actions |
| `Profile.tsx` | Sửa nhỏ | Bỏ fallback `external_wallet_address` |
| `EditProfile.tsx` | Sửa nhỏ | Bỏ prefill từ `external_wallet_address` |
| `WalletManagement.tsx` | Sửa | Xoá `handleConnectExternalWallet` |
| `WalletSettingsDialog.tsx` | Sửa nhỏ | Cập nhật theo WalletManagement |
| Edge Functions | Giữ nguyên | Không xoá, chỉ ngưng gọi từ frontend |
