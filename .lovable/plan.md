

# Tăng cường hiệu ứng chữ RICH cho Người Gởi -- Đồng bộ với mẫu Video 2

## Tình trạng hiện tại

Sau khi kiểm tra kỹ mã nguồn, cả bên **Người Gởi** (`GiftCelebrationModal`) và **Người Nhận** (`DonationReceivedCard`) đều sử dụng cùng component `RichTextOverlay` (25 chữ RICH, 9 màu cầu vồng, z-10001) và `DonationCelebration` (confetti + pháo hoa, z-9998) + nhạc `rich-3.mp3` lặp liên tục.

Tuy nhiên, hiệu ứng animation `rich-float` hiện tại khá nhỏ (scale tối đa 1.2x, di chuyển tối đa 40px). Để chữ RICH **nổi bật hơn, nhảy múa mạnh hơn** giống như mẫu video 2, cần tăng cường animation.

## Thay đổi cần thực hiện

### 1. `tailwind.config.ts` -- Tăng cường animation `rich-float`
- Tăng **scale** từ 1.2x lên **1.5x** để chữ RICH to hơn khi nhảy
- Tăng **translateY** từ -40px lên **-60px** để chữ bay cao hơn
- Thêm **translateX** +/- 20px để chữ lắc ngang, tạo cảm giác nhảy múa tung tăng
- Giảm thời gian animation từ 3s xuống **2.5s** để nhịp nhanh hơn, vui hơn

### 2. `src/components/donations/RichTextOverlay.tsx` -- Tăng glow effect
- Tăng cường `textShadow` với lớp glow rộng hơn (64px blur) để chữ RICH phát sáng mạnh hơn
- Tăng font-weight từ `font-black` lên kết hợp thêm `scale` CSS ban đầu để chữ to hơn
- Thêm `filter: brightness(1.2)` để màu sắc rực rỡ hơn

## Kết quả mong đợi
- Chữ RICH 9 sắc cầu vồng nhảy múa mạnh mẽ, nổi bật khắp màn hình
- Hiệu ứng hoàn toàn giống nhau giữa Người Gởi và Người Nhận
- Pháo hoa + confetti vẫn bắn liên tục ở tầng dưới (z-9998)
- Nhạc rich-3.mp3 vẫn lặp liên tục cho đến khi đóng

