

# Sửa lỗi hiển thị địa chỉ BTC trên trang cá nhân + dialog gửi BTC

## Nguyên nhân gốc

1. **Trang cá nhân người khác**: `useProfile.ts` dòng 86 query `public_profiles` nhưng **thiếu `btc_address`** trong danh sách select → `profile.btc_address` luôn `undefined` → không hiển thị
2. **Dialog gửi BTC**: Prop `presetRecipient` trong `UnifiedGiftSendDialogProps` thiếu field `btcAddress`, và các nơi gọi dialog (DonationButton, ChatInput, WalletCenterContainer) không truyền `btcAddress`

## Thay đổi

### 1) `src/hooks/useProfile.ts` dòng 86
Thêm `btc_address` vào select query cho `public_profiles`:
```
.select('id, username, display_name, avatar_url, full_name, bio, cover_url, created_at, public_wallet_address, btc_address, social_links, is_banned, location, workplace, education, relationship_status')
```

### 2) `src/components/donations/UnifiedGiftSendDialog.tsx`
Thêm `btcAddress?: string | null` vào `presetRecipient` trong `UnifiedGiftSendDialogProps` interface (dòng 71-78)

### 3) `src/components/donations/DonationButton.tsx`
Truyền thêm `btcAddress` khi gọi `UnifiedGiftSendDialog` presetRecipient (lấy từ props)

### 4) `src/modules/chat/components/ChatInput.tsx`
Truyền thêm `btcAddress` vào presetRecipient nếu có

### 5) `src/components/wallet/WalletCenterContainer.tsx`
Truyền thêm `btcAddress` vào presetRecipient khi mở dialog gửi

## Kết quả
- Trang cá nhân hiển thị địa chỉ BTC cho cả owner lẫn visitor
- Dialog gửi BTC nhận đúng `btcAddress` của người nhận → BIP21 link chính xác

