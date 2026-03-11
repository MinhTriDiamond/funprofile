

## Kiểm tra Multi-Send Gift — Phát hiện & Kế hoạch sửa

### Vấn đề phát hiện

Sau khi đọc kỹ `UnifiedGiftSendDialog.tsx`, `useSendToken.ts`, và `useDonationFlow.ts`, phát hiện **3 bug** trong luồng tặng tiền hàng loạt:

---

### Bug 1: Race condition — Background tasks xung đột (Nghiêm trọng)

`useSendToken.sendToken()` sau khi nhận hash sẽ chạy một **background async task** để polling receipt và ghi DB. Trong multi-send:

```text
Send #1 → hash → background task #1 chạy (setTxStep, toast...)
  resetState() → Send #2 → hash → background task #2 chạy
    resetState() → Send #3 → hash → background task #3 chạy
```

3 background tasks chạy đồng thời, mỗi cái gọi `setTxStep('confirming')`, `setTxStep('success')`, và hiện toast **"Giao dịch đã được xác nhận thành công!"** riêng biệt. User sẽ thấy 3 toast success lẫn lộn và state `txStep` bị ghi đè liên tục.

**Sửa**: Thêm cơ chế `abortController` hoặc flag `skipBackground` vào `useSendToken`. Khi gọi từ multi-send, suppress background toast và receipt polling (vì `recordMultiDonationsSequential` đã xử lý riêng).

---

### Bug 2: Stale closure trong `recordDonationWithRetry` (Trung bình)

Dependency array: `[amount, chainId, customMessage, ...]`
Nhưng body sử dụng `selectedChainId` (UI chain) và `resolvedTokenAddress` — **không có trong deps**. Nếu user đổi chain trước khi ghi nhận hoàn tất, callback sử dụng giá trị cũ.

**Sửa**: Đổi `chainId` thành `selectedChainId` và thêm `resolvedTokenAddress` vào dependency array.

---

### Bug 3: Dead code `useDonationFlow.ts` (Nhẹ)

File `useDonationFlow.ts` chứa logic `sendMulti`, `recordMultiDonationsSequential` duplicate nhưng **không được import ở đâu**. Logic thực tế nằm inline trong `UnifiedGiftSendDialog.tsx`.

**Sửa**: Xóa file dead code để tránh nhầm lẫn khi maintain.

---

### Kế hoạch sửa chi tiết

#### File 1: `src/hooks/useSendToken.ts`
- Thêm option `skipBackground?: boolean` vào `SendTokenParams`
- Khi `skipBackground = true`: return hash ngay, **không** chạy background receipt polling và DB insert, **không** hiện toast success/timeout
- Multi-send sẽ truyền `skipBackground: true`

#### File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`
- Trong `handleSend` multi-send loop: gọi `sendToken` với `skipBackground: true` (nếu implement option) hoặc suppress bằng cách wrap `sendToken` call
- Sửa dependency array của `recordDonationWithRetry`: thay `chainId` → `selectedChainId`, thêm `resolvedTokenAddress`

#### File 3: Xóa `src/components/donations/gift-dialog/useDonationFlow.ts`

