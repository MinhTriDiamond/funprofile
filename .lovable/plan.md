

# Sửa lỗi BIP21 deep link mở tab trắng trên trình duyệt

## Vấn đề
Hình ảnh cho thấy khi bấm "Mở ví BTC để gửi", trình duyệt mở tab mới với URL `bitcoin:bc1qdl98...?amount=0.00004` nhưng hiển thị trang trắng. Nguyên nhân: `window.open(bip21Url, '_blank')` mở tab mới — trình duyệt desktop không có ứng dụng ví BTC đăng ký protocol handler `bitcoin:` nên hiển thị trang trống.

## Giải pháp

### `src/components/donations/UnifiedGiftSendDialog.tsx` (dòng 643-651)

Thay `window.open(bip21Url, '_blank')` bằng `window.location.href = bip21Url`:
- Trên **mobile** có ví BTC: hệ điều hành tự mở ứng dụng ví (Trust Wallet, Bitget...)
- Trên **desktop** không có ví: không mở tab trắng nữa, chỉ hiển thị toast hướng dẫn

Thêm fallback: dùng `setTimeout` để kiểm tra — nếu trang vẫn visible sau 2 giây (nghĩa là không có ứng dụng ví xử lý), hiển thị toast hướng dẫn copy địa chỉ BTC thủ công + hiện nút copy.

```typescript
onBtcSendDirect={() => {
  const recipient = recipientsWithWallet[0];
  const btcAddr = recipient?.btcAddress;
  if (!btcAddr) { toast.error('Người nhận chưa có địa chỉ ví BTC'); return; }
  const bip21Url = `bitcoin:${btcAddr}?amount=${amount}`;
  
  // Dùng location.href thay vì window.open để kích hoạt protocol handler
  window.location.href = bip21Url;
  
  // Fallback: nếu sau 2s vẫn ở trang → không có ví BTC xử lý
  const fallbackTimer = setTimeout(() => {
    // Copy địa chỉ vào clipboard
    navigator.clipboard.writeText(btcAddr);
    toast.info(
      `Không tìm thấy ví BTC. Địa chỉ đã được copy: ${btcAddr.slice(0, 12)}... — Số lượng: ${amount} BTC`,
      { duration: 10000 }
    );
  }, 2000);
  
  // Nếu ví mở thành công (trang bị blur), hủy fallback
  const handleBlur = () => {
    clearTimeout(fallbackTimer);
    window.removeEventListener('blur', handleBlur);
  };
  window.addEventListener('blur', handleBlur);
  
  toast.success('Đang mở ví BTC...', { duration: 3000 });
  setTimeout(() => handleDialogClose(), 1500);
}}
```

## Kết quả
- Không còn mở tab trắng trên desktop
- Mobile: ví BTC mở tự động như trước
- Desktop không có ví: tự động copy địa chỉ BTC + hướng dẫn gửi thủ công

