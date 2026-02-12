
# Hiệu ứng RICH + Pháo hoa nổi lên trên Card chúc mừng

## Vấn đề hiện tại
Hiệu ứng chữ "RICH" nhảy múa và pháo hoa (confetti) đang bị ẩn phía sau card chúc mừng vì:
1. `DonationCelebration` (chứa confetti + RICH text) render ở `z-[200]` nhưng nằm **ngoài** Dialog Portal, nên bị Dialog (z-[150]) đè lên do Radix Portal tạo stacking context riêng.
2. `RichTextOverlay` bên trong card bị giới hạn bởi `overflow-hidden` + `rounded-2xl` của card, nên chữ RICH không thể bay ra ngoài card.

## Giải pháp
Đưa cả hiệu ứng RICH text và confetti lên **trên** Dialog bằng cách tăng z-index cao hơn Dialog Portal.

### Thay đổi cụ thể:

**1. `src/components/donations/DonationCelebration.tsx`**
- Tăng z-index từ `z-[200]` lên `z-[9999]` để đảm bảo nổi trên tất cả các layer bao gồm Dialog Portal
- Confetti (canvas-confetti) mặc định render trên canvas riêng cũng cần set z-index cao -- thêm `zIndex: 9999` vào các lệnh `confetti()` calls

**2. `src/components/donations/RichTextOverlay.tsx`**
- Thay đổi từ `absolute` (bị giới hạn trong card) sang `fixed` (nổi toàn màn hình)
- Tăng z-index lên `z-[9999]` để nổi trên Dialog
- Tăng số lượng chữ RICH và phân bố rộng hơn khắp màn hình
- Tăng kích thước chữ lớn hơn (text-2xl, text-3xl, text-4xl) cho nổi bật

**3. `src/components/donations/GiftCelebrationModal.tsx`**
- Đảm bảo `DonationCelebration` được render với `showRichText={false}` (vì RICH text giờ do `RichTextOverlay` xử lý riêng ở fixed layer)
- Đưa `RichTextOverlay` ra ngoài card container (không còn bị `overflow-hidden` clip)

**4. `src/components/donations/DonationReceivedCard.tsx` + `DonationSuccessCard.tsx`**
- Tương tự: đưa `RichTextOverlay` ra ngoài card container để nổi toàn màn hình

## Kết quả
- Chữ "RICH" 9 màu cầu vồng sẽ nhảy múa nổi bật **phía trên** card chúc mừng, bay khắp màn hình
- Pháo hoa confetti cũng bắn tung tóe **phía trên** card, không bị che khuất
- Card nội dung vẫn hiển thị bình thường bên dưới các hiệu ứng
