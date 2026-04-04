

# Cho phép gửi BTC dù hiển thị "Không đủ số dư"

## Nguyên nhân

Hệ thống chỉ theo dõi 1 địa chỉ BTC, trong khi số dư thực tế nằm trong ví bên ngoài (Trust Wallet, Exodus...) với nhiều địa chỉ HD. Vì vậy, kiểm tra `hasEnoughBalance` cho BTC thường sai — chặn người dùng không cho tiến hành gửi.

## Giải pháp

Bỏ điều kiện `hasEnoughBalance` khỏi logic chặn khi đang ở mạng BTC. Vẫn hiển thị cảnh báo "Không đủ số dư" nhưng chuyển thành **cảnh báo mềm** (warning) thay vì chặn cứng.

## Thay đổi

### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

**Dòng 217 — `canProceedToConfirm`:**
```typescript
// Trước
const canProceedToConfirm = (isBtcNetwork || isConnected) && recipientsWithWallet.length > 0 && isValidAmount && hasEnoughBalance && !isWrongNetwork;

// Sau — BTC bỏ qua kiểm tra số dư
const canProceedToConfirm = (isBtcNetwork || isConnected) && recipientsWithWallet.length > 0 && isValidAmount && (isBtcNetwork || hasEnoughBalance) && !isWrongNetwork;
```

**Dòng 219 — `isSendDisabled`:**
```typescript
// Trước
const isSendDisabled = ... || !hasEnoughBalance || ...

// Sau — BTC bỏ qua kiểm tra số dư
const isSendDisabled = ... || (!isBtcNetwork && !hasEnoughBalance) || ...
```

### File: `src/components/donations/gift-dialog/GiftFormStep.tsx`

**Dòng 276-278 — Đổi cảnh báo "Không đủ số dư" thành warning cho BTC:**
```tsx
// Khi BTC: hiện cảnh báo màu vàng (warning) thay vì đỏ (error)
// Khi token khác: giữ nguyên đỏ (error) và chặn
{parsedAmountNum > 0 && !hasEnoughBalance && (
  <p className={`text-xs mt-1 ${isBtcNetwork ? 'text-amber-600' : 'text-destructive'}`}>
    {isBtcNetwork
      ? `⚠️ Số dư on-chain hiện tại không đủ. Nếu ví ngoài có đủ BTC, bạn vẫn có thể tiếp tục.`
      : `Không đủ số dư (cần ${totalAmount.toLocaleString()} ${selectedToken.symbol})`}
  </p>
)}
```

Cần thêm prop `isBtcNetwork` (hoặc `selectedChainId`) vào `GiftFormStep` — hiện đã có `selectedChainId` trong props.

## Kết quả

- Gửi BTC: nhập số lượng → cảnh báo vàng nếu on-chain không đủ → vẫn bấm "Xem lại & Xác nhận" được → QR code + BIP21 link hoạt động bình thường
- Gửi token EVM: giữ nguyên logic chặn cứng như cũ

