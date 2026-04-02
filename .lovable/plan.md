

## Sửa build error + Chỉnh Gift Card gọn trên mobile

### Vấn đề
1. **Build error** — cần kiểm tra kỹ hơn, có thể từ file `NotificationDropdown.tsx` vừa sửa lớn
2. **Gift Card trên mobile quá to** — User muốn gọn lại như trên desktop

### Thay đổi

#### 1) Fix build error
- Kiểm tra và deploy lại, có thể là lỗi transient. Nếu có lỗi cụ thể sẽ sửa trực tiếp.

#### 2) `src/components/feed/GiftCelebrationCard.tsx` — Thu gọn trên mobile

**Avatar nhỏ hơn trên mobile:**
- Avatar: `w-10 h-10 sm:w-12 sm:h-12` (thay vì luôn `w-12 h-12`)
- Tên truncate: `max-w-[80px] sm:max-w-[120px]`

**Font chữ nhỏ hơn trên mobile:**
- Tiêu đề chính: `text-base sm:text-lg` (thay vì luôn `text-lg`)
- Padding card: `p-3 sm:p-4 pt-2`

**Gift message compact:**
- Font: `text-xs sm:text-sm`
- Padding: `px-2 py-1.5 sm:px-3 sm:py-2`

**Floating coins giảm trên mobile:**
- Ẩn bớt coins trên mobile bằng `hidden sm:block` cho một số coins (giữ ~8 trên mobile thay vì 16)

**Action buttons compact:**
- Giảm `py-3 min-h-[48px]` → `py-2 min-h-[40px] sm:py-3 sm:min-h-[48px]`
- Font: `text-xs` → giữ nguyên `text-xs sm:text-sm`

#### 3) `src/components/feed/PostFooter.tsx` — Thêm nền trắng
- Dòng 42: thêm `bg-card` vào div action buttons

#### 4) `src/components/feed/GiftCelebrationCard.tsx` — Nền trắng cho action buttons
- Dòng 460: đổi `bg-black/10` → `bg-white dark:bg-card` cho hàng action buttons

### Kết quả
- Gift card trên mobile gọn gàng hơn: avatar nhỏ, font nhỏ hơn, ít coins bay
- Hàng Thích/Bình luận/Chia sẻ có nền trắng rõ ràng
- Build error được fix

