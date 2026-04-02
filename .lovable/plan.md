

# Bổ sung nút "Mở ví BTC để gửi" hoạt động trực tiếp

## Vấn đề
Khi chọn mạng BTC, nút "Mở ví BTC để gửi →" ở bước 1 (GiftFormStep) chỉ chuyển sang bước xác nhận (confirm step) — user phải bấm thêm 1 lần nữa mới thực sự mở ví BTC. Cần cho nút này **trực tiếp mở BIP21 deep link** luôn, bỏ qua bước confirm.

## Thay đổi

### 1) `src/components/donations/UnifiedGiftSendDialog.tsx`
- Tạo hàm `handleBtcSendDirect` chứa logic BIP21 (lấy từ `handleSend` dòng 372-379): tạo URL `bitcoin:{addr}?amount={amount}`, gọi `window.open`, hiển thị toast thành công
- Truyền hàm này xuống `GiftFormStep` qua prop mới `onBtcSendDirect`
- Giữ nguyên `handleSend` cho flow EVM

### 2) `src/components/donations/gift-dialog/GiftFormStep.tsx`
- Nhận prop `onBtcSendDirect?: () => void`
- Khi `selectedChainId === 0` (BTC): nút bấm gọi `onBtcSendDirect` thay vì `onGoToConfirm`
- Giữ nguyên text "Mở ví BTC để gửi →"

## Kết quả
- Chọn mạng BTC → nhập số lượng → bấm "Mở ví BTC để gửi" → mở ví BTC ngay lập tức qua BIP21 deep link, không cần qua bước xác nhận

