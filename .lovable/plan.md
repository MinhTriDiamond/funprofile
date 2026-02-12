

# Tăng cường Confetti + Pháo hoa + Chữ RICH liên tục rực rỡ hơn

## Vấn đề
Hiện tại confetti và pháo hoa đã chạy lặp lại (600ms/1200ms), nhưng hiệu ứng chưa đủ dày đặc và rực rỡ như mong muốn. Chữ "RICH" cũng cần nhiều hơn và nổi bật hơn.

## Thay đổi

### 1. `src/components/donations/DonationCelebration.tsx`
- Tăng `particleCount` cho confetti từ 80 lên 120 mỗi đợt, spread rộng hơn
- Tăng `particleCount` cho firework từ 100 lên 150, thêm nhiều điểm bắn (từ 1 lên 2 firework mỗi lần)
- Giảm interval confetti từ 600ms xuống 400ms để bắn liên tục dày đặc hơn
- Giảm interval firework từ 1200ms xuống 800ms
- Thêm thêm đợt confetti bắn từ nhiều góc khác nhau (trên, dưới, trái, phải)
- Tăng `ticks` (thời gian tồn tại mỗi hạt) từ 200 lên 300 để confetti rơi lâu hơn trên màn hình

### 2. `src/components/donations/RichTextOverlay.tsx`
- Tăng số lượng chữ "RICH" từ 15 lên 25 vị trí phân bố khắp màn hình
- Thêm nhiều kích thước hơn (text-5xl) cho một số chữ RICH lớn nổi bật
- Tăng cường text-shadow với blur rộng hơn để chữ phát sáng mạnh hơn

### File cần sửa:
1. `src/components/donations/DonationCelebration.tsx` — tăng mật độ confetti + firework
2. `src/components/donations/RichTextOverlay.tsx` — thêm nhiều chữ RICH hơn, sáng hơn

