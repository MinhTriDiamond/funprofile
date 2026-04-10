

## Kế hoạch: Nâng cấp luồng gửi/nhận BTC trên di động

### Vấn đề hiện tại

1. **Hiển thị sai prompt "Kết nối ví"**: Khi chọn mạng BTC, form vẫn hiện "Kết nối ví để gửi" nếu ví EVM chưa kết nối — gây nhầm lẫn vì BTC không cần ví EVM
2. **Thiếu tính năng nhận BTC**: Trang cá nhân chỉ hiện địa chỉ BTC để copy, chưa có QR code để nhận tiền nhanh
3. **Mobile UX chưa mượt**: BIP21 deep link hoạt động nhưng fallback QR panel chưa tối ưu cho mobile

### Thay đổi

**1. `src/components/donations/gift-dialog/GiftFormStep.tsx`**
- Ẩn prompt "Kết nối ví để gửi" khi `selectedChainId === BTC_MAINNET` (BTC không cần EVM wallet)
- Thay bằng thông báo nhẹ: hiển thị địa chỉ BTC của người gửi từ profile, hoặc cảnh báo nếu chưa có
- Hiển thị địa chỉ BTC trên mobile (bỏ `hidden sm:flex` cho BTC addresses)

**2. `src/components/donations/gift-dialog/BtcWalletPanel.tsx`**
- Tối ưu cho mobile: QR code nhỏ hơn (180px thay vì 220px) trên màn hình nhỏ
- Thêm nút "Sao chép BIP21 URL" để dễ paste vào ví khác
- Cải thiện UX polling: hiện animation rõ ràng hơn khi đang chờ

**3. Tạo component `src/components/profile/BtcReceiveQRDialog.tsx`**
- Dialog hiện QR code địa chỉ BTC của user (từ profile)
- Nút copy địa chỉ + chia sẻ
- Mở từ trang cá nhân khi nhấn vào địa chỉ BTC

**4. `src/components/profile/ProfileHeader.tsx`**
- Khi nhấn vào địa chỉ BTC, mở dialog QR code nhận BTC thay vì chỉ copy
- Giữ nút copy riêng bên cạnh

**5. `src/components/donations/UnifiedGiftSendDialog.tsx`**
- Khi BTC + mobile: tự động hiển thị BtcWalletPanel ngay ở bước confirm thay vì đợi timeout 1.5s
- Cải thiện `handleSend` cho BTC: detect mobile và ưu tiên deep link mượt hơn

### Kết quả

- Người dùng mobile chọn BTC → không cần kết nối ví EVM → nhập số lượng → xác nhận → tự mở ví BTC native
- Người nhận có QR code BTC trên trang cá nhân để nhận tiền nhanh
- Toàn bộ flow mượt hơn, ít bước thừa, phù hợp mobile

