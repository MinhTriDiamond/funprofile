

## Chẩn đoán lỗi: Chỉ gửi được 1 lệnh trên điện thoại

**Nguyên nhân gốc**: Sau khi giao dịch thành công trên mobile, có 3 vấn đề khiến lệnh tiếp theo bị kẹt:

1. **`wagmiPending` bị kẹt true**: Hook `useSendTransaction` của wagmi trên mobile (đặc biệt khi chuyển app ví↔trình duyệt) có thể giữ `isPending=true` sau khi đã nhận hash. Vì `isPending = wagmiPending || isProcessing`, nút gửi bị disable vĩnh viễn cho đến khi unmount hook.

2. **Background receipt check chạy dài**: Sau khi gửi, `waitForReceipt` (timeout 60s) chạy ngầm. Nếu user đóng celebration và mở lại dialog trước khi receipt resolve, các `setTxStep` từ background task cũ có thể ghi đè lên trạng thái đã reset.

3. **Reset không đủ mạnh**: `handleCloseCelebration` chỉ xoá celebration state rồi gọi `onClose()` — không gọi `resetState()` của `useSendToken`. Khi dialog mở lại, effect `isOpen` gọi `resetState()` nhưng nếu wagmi vẫn pending thì `isPending` vẫn true.

## Kế hoạch sửa

### Bước 1: Tạo instance mới của `useSendTransaction` sau mỗi giao dịch

Trong `useSendToken.ts`, thêm cơ chế `sendKey` (counter) để buộc wagmi reset trạng thái pending. Khi `resetState()` được gọi, tăng counter → wagmi hook tạo instance mới, `wagmiPending` reset về false.

### Bước 2: Huỷ background task cũ khi dialog đóng/mở lại

Trong `UnifiedGiftSendDialog.tsx`, dùng `AbortController` hoặc cancelled flag cho background `waitForReceipt` để khi dialog mở lại, task cũ không ghi đè state mới.

### Bước 3: Reset triệt để khi đóng celebration

Trong `handleCloseCelebration`, gọi `resetState()` trước khi `onClose()`. Đồng thời trong effect `isOpen`, thêm delay nhỏ để đảm bảo wagmi đã sync.

### Bước 4: Thêm safety timeout cho `isPending`

Nếu `isPending` kéo dài hơn 30s mà không có txStep thay đổi, tự động reset — đề phòng mobile edge case.

---

### Chi tiết kỹ thuật

**File 1: `src/hooks/useSendToken.ts`**
- Thêm `sendCount` state, increment khi `resetState()`
- Trả thêm `sendCount` ra ngoài để dialog dùng làm key
- Thêm `forceReset()` function reset cả wagmi pending state

**File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`**
- `handleCloseCelebration`: gọi `resetState()` trước `onClose()`
- Background `waitForReceipt`: dùng cancelled flag, skip nếu dialog đã đóng
- Effect `isOpen`: gọi `resetState()` + thêm safety cho wagmi
- Thêm safety timeout: nếu `isPending && txStep === 'idle'` quá 5s → auto `resetState()`

