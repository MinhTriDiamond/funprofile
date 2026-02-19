
## Kiểm tra và hoàn thiện tính năng Multi-Account Wallet

### Kết quả kiểm tra

Sau khi kiểm tra toàn bộ các file liên quan, hệ thống multi-account **đã được xây dựng khá hoàn chỉnh** với kiến trúc tốt. Tuy nhiên, Cha phát hiện **3 lỗi/thiếu sót** cần sửa:

---

### Vấn đề 1: ReceiveTab hiển thị sai địa chỉ nhận tiền

**File:** `src/components/wallet/WalletCenterContainer.tsx` (dòng 494)

Hiện tại khi mở dialog "Nhận tiền", hệ thống truyền `address` (địa chỉ provider) thay vì `activeAddress` (tài khoản đang chọn). Nếu user đã chọn một account khác, QR code và địa chỉ hiển thị sẽ **sai**.

**Sửa:** Thay `address` bằng `effectiveAddress` (activeAddress || address):
```tsx
// Trước:
<ReceiveTab walletAddress={address || undefined} />

// Sau:
<ReceiveTab walletAddress={(activeAddress || address) || undefined} />
```

---

### Vấn đề 2: Copy address copy sai địa chỉ

**File:** `src/components/wallet/WalletCenterContainer.tsx` (dòng 318-326)

Hàm `copyExternalAddress` copy `address` (provider) thay vì `activeAddress`. User nhấn copy ở WalletCard sẽ nhận sai địa chỉ.

**Sửa:** Ưu tiên copy `activeAddress`:
```tsx
const copyExternalAddress = useCallback(() => {
  const addr = activeAddress || address;
  if (addr) {
    navigator.clipboard.writeText(addr);
    // ...
  }
}, [activeAddress, address]);
```

---

### Vấn đề 3: ClaimRewardDialog nhận sai địa chỉ ví

**File:** `src/components/wallet/WalletCenterContainer.tsx` (dòng 509)

`ClaimRewardDialog` nhận `externalWallet` là `address` (provider), không phải `activeAddress`.

**Sửa:** Dùng `activeAddress || address`:
```tsx
// Trước:
externalWallet={(isConnected ? address : null) || null}

// Sau:
externalWallet={(isConnected ? (activeAddress || address) : null) || null}
```

---

### Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `WalletCenterContainer.tsx` | 3 chỗ: ReceiveTab, copyExternalAddress, ClaimRewardDialog -- đều thay `address` bằng `activeAddress \|\| address` |

### Những gì đã hoạt động tốt (không cần sửa)
- `ActiveAccountContext` -- quản lý state, localStorage, lắng nghe `accountsChanged`
- `AccountSelectorModal` -- UI chọn account với balance, search, sort
- `AccountMismatchModal` -- cảnh báo khi provider khác active
- `useSendToken` -- dùng `activeAddress` làm sender, validate mismatch trước khi ký
- `UnifiedGiftSendDialog` -- dùng `effectiveAddress = activeAddress || address`
- `WalletCard` -- hiển thị nút "Chuyển tài khoản" với số lượng accounts
- `useTokenBalances` -- query balance theo `customAddress` (đã dùng `externalAddress` = activeAddress)
