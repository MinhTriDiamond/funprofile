

## Phân tích nguyên nhân

Khi gửi tặng cho user đầu tiên, `useSendToken` chạy **2 luồng song song** cùng theo dõi giao dịch:
1. **Luồng Dialog**: `waitForReceipt` trong `UnifiedGiftSendDialog` 
2. **Luồng Background**: IIFE bên trong `useSendToken` (vì `skipBackground` mặc định = `false`)

Sau khi gửi xong user 1, user đóng dialog và mở lại cho user 2. Lúc này `resetState()` được gọi (`txStep = 'idle'`). **Nhưng** luồng background từ lần gửi trước vẫn đang chạy và ghi đè `txStep` thành `'confirming'` hoặc `'finalizing'` → `isInProgress = true` → **nút Gửi bị vô hiệu hóa**, MetaMask không bao giờ được gọi.

## Giải pháp

Chỉ cần 1 thay đổi nhỏ trong `UnifiedGiftSendDialog.tsx`:

| File | Thay đổi |
|------|----------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Thêm `skipBackground: true` vào lệnh `sendToken` cho single send (dòng 467) |

Vì dialog đã tự xử lý `waitForReceipt` + `recordDonationBackground` riêng, không cần `useSendToken` chạy luồng background nữa. Điều này loại bỏ hoàn toàn xung đột state giữa 2 lần gửi.

### Dòng cần sửa

```typescript
// Trước (dòng 467):
const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress, amount });

// Sau:
const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress, amount, skipBackground: true });
```

Thay đổi này đảm bảo sau khi `sendToken` trả về hash, không có luồng nền nào tiếp tục ghi đè `txStep`, nên khi user mở dialog lần 2, `resetState()` giữ nguyên `txStep = 'idle'` và nút Gửi hoạt động bình thường.

