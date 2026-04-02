

# Cải thiện flow BTC: Tự động thử mở ví trước, QR panel là fallback

## Vấn đề

Hiện tại khi bấm "Xác nhận & Tặng" cho BTC:
- **Mobile**: Gọi `window.location.href = bip21Url` → mở ví ✓
- **Desktop**: Chỉ hiện QR panel mà KHÔNG thử mở ví → user phải tự bấm "Thử mở ví BTC"

User muốn: bấm "Xác nhận & Tặng" → ví bật lên ngay (giống EVM ở hình 2), QR chỉ là phương án dự phòng.

## Lưu ý kỹ thuật

BTC là mạng non-EVM — MetaMask/Trust/Bitget KHÔNG thể gửi BTC qua giao diện web3 inject (sendTransaction). Cách duy nhất là BIP21 deep link (`bitcoin:addr?amount=X`). Trên desktop, nếu user có ví BTC cài đặt (Electrum, Sparrow, hoặc MetaMask Extension hỗ trợ BTC), deep link sẽ kích hoạt ví tự động.

## Thay đổi

### File: `src/components/donations/UnifiedGiftSendDialog.tsx` (hàm `handleSend`, dòng 411-431)

Sửa logic BTC trong `handleSend`:
- **Bỏ điều kiện `if (isMobile)`** — gọi `window.location.href = bip21Url` cho MỌI nền tảng (cả desktop lẫn mobile)
- Sau 1.5 giây, nếu trang vẫn hiển thị (ví không bật), mới hiện BtcWalletPanel (QR + copy) như fallback
- Khi ví mở thành công (window blur), hủy fallback timer

```
handleSend BTC flow:
1. setBtcBip21Url + setBtcPollingEnabled(true)
2. window.location.href = bip21Url  ← thử mở ví ngay
3. setTimeout 1.5s → setBtcTxStep('signing')  ← chỉ hiện QR panel nếu ví không bật
4. window.addEventListener('blur') → clearTimeout  ← ví bật thì hủy fallback
```

### File: `src/components/donations/gift-dialog/BtcWalletPanel.tsx`

Thêm dòng thông báo phía trên QR: "Nếu ví BTC không tự mở, hãy quét QR code hoặc sao chép thông tin bên dưới"

## Kết quả

- Bấm "Xác nhận & Tặng" → hệ thống tự động thử mở ví BTC ngay lập tức
- Nếu có ví BTC trên thiết bị → ví bật lên xác nhận (giống hình 2)
- Nếu không có ví → sau 1.5 giây hiện QR panel (hình 1) làm phương án dự phòng
- Polling Mempool.space vẫn chạy để chờ xác nhận on-chain

