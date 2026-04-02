

# Hiển thị địa chỉ BTC trên trang cá nhân + Tự động chuyển ví BTC khi gửi/nhận

## Vấn đề
1. **Trang cá nhân** không hiển thị địa chỉ ví BTC (chỉ có ví EVM)
2. **Khi gửi BTC**, hệ thống vẫn dùng địa chỉ EVM của người nhận thay vì `btc_address` → BIP21 link sai

## Thay đổi

### 1) `src/hooks/useProfile.ts` — Thêm `btc_address` vào ProfileData
- Thêm `btc_address?: string | null` vào interface `ProfileData`

### 2) `src/pages/Profile.tsx` — Hiển thị địa chỉ BTC bên dưới ví EVM
- Import logo BTC
- Thêm 1 dòng mới dưới dòng hiển thị `public_wallet_address` (dòng ~279-296):
  - Icon BTC (logo cam) + địa chỉ BTC rút gọn + nút Copy
  - Nếu chưa có → hiện "Thêm địa chỉ BTC" (chỉ owner) hoặc ẩn (người khác)
- Lưu ý: Khi xem profile người khác, query `public_profiles` không có `btc_address` → cần query thêm từ `profiles` hoặc update view

### 3) Migration — Thêm `btc_address` vào view `public_profiles`
- Cập nhật view `public_profiles` để bao gồm cột `btc_address` từ bảng `profiles`
- Để trang cá nhân người khác cũng hiển thị được địa chỉ BTC

### 4) `src/components/donations/gift-dialog/types.ts` — Thêm `btcAddress` vào ResolvedRecipient
- Thêm `btcAddress?: string | null`

### 5) `src/components/donations/gift-dialog/useRecipientSearch.ts` — Lấy `btc_address` khi search
- Thêm `btc_address` vào `selectFields`
- Map `btcAddress: p.btc_address` trong `mapProfileToRecipient`

### 6) `src/components/donations/UnifiedGiftSendDialog.tsx` — Dùng `btcAddress` khi gửi BTC
- Trong `handleSend` khi `isBtcNetwork`: dùng `recipient.btcAddress` thay vì `recipient.walletAddress` cho BIP21 URL
- Trong `recipientsWithWallet`: khi BTC network, filter theo `btcAddress` thay vì `walletAddress`
- Trong `presetRecipient` mapping: lấy thêm `btcAddress` từ profile

### 7) `src/components/donations/gift-dialog/GiftFormStep.tsx` — Hiển thị đúng địa chỉ
- Khi `selectedChainId === BTC_MAINNET`: hiển thị `recipient.btcAddress` thay vì `recipient.walletAddress`

## Tóm tắt files

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm `btc_address` vào view `public_profiles` |
| `useProfile.ts` | Thêm field `btc_address` vào `ProfileData` |
| `Profile.tsx` | Hiển thị dòng địa chỉ BTC dưới ví EVM |
| `types.ts` | Thêm `btcAddress` vào `ResolvedRecipient` |
| `useRecipientSearch.ts` | Lấy + map `btc_address` |
| `UnifiedGiftSendDialog.tsx` | Dùng `btcAddress` cho BIP21 khi mạng BTC |
| `GiftFormStep.tsx` | Hiển thị đúng địa chỉ theo mạng |

## Kết quả
- Trang cá nhân hiển thị địa chỉ ví BTC (logo cam) bên dưới ví EVM
- Khi chọn mạng BTC → hệ thống tự chuyển sang dùng `btc_address` của người nhận
- BIP21 deep link chứa đúng địa chỉ BTC → gửi/nhận thông suốt

