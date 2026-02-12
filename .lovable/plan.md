
# Fix chữ RICH bị confetti che khuất + Cân bằng pháo hoa

## Nguyên nhân gốc
- Thư viện `canvas-confetti` tạo canvas riêng với `zIndex: 9999`
- `RichTextOverlay` cũng dùng `z-[9999]` -- cùng tầng nên confetti che khuất chữ RICH
- Pháo hoa vẫn còn dày, cần giảm thêm để thẻ card đọc được

## Thay đổi cần thực hiện

### 1. `src/components/donations/RichTextOverlay.tsx`
- Nâng z-index từ `z-[9999]` lên `z-[10001]` để chữ RICH luôn nổi TRÊN confetti canvas
- Đảm bảo chữ RICH hiển thị rõ ràng, nhảy múa không bị che

### 2. `src/components/donations/DonationCelebration.tsx`
- Giảm `zIndex` của confetti từ `9999` xuống `9998` để confetti nằm DƯỚI cả RICH text và thẻ card
- Giữ nguyên interval (1500ms confetti, 2500ms fireworks) -- mật độ cân bằng theo chuẩn thương hiệu

### Kết quả mong đợi
- Thứ tự hiển thị từ trên xuống: Chữ RICH (z-10001) > Thẻ Card Dialog (z-50 default) > Confetti/Pháo hoa (z-9998)
- Chữ RICH 9 sắc cầu vồng nhảy múa rõ ràng khắp màn hình, TRÊN confetti
- Pháo hoa vẫn bắn liên tục nhưng không che khuất thẻ card và chữ RICH
