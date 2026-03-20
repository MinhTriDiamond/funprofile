

## Kế hoạch: Banner nhắc nhở gắn liên kết mạng xã hội (Ngôn ngữ Ánh sáng ✨)

### Tổng quan
Tạo component `SocialLinkReminderBanner` hiển thị cho user chưa gắn social links, với lời nhắn dễ thương, tích cực theo phong cách "Ngôn ngữ Ánh sáng".

### Câu thông báo
> ✨ Hãy để thế giới biết đến bạn nhiều hơn nha! Gắn liên kết mạng xã hội vào hồ sơ để điểm Ánh sáng của bạn tỏa sáng rực rỡ hơn 💖

- CTA: "Gắn liên kết ngay ✨"
- Dismiss: "Để sau nha 💫"

### Các bước

**1. Tạo `src/components/profile/SocialLinkReminderBanner.tsx`**
- Tái sử dụng pattern dismiss/cooldown từ `AccountUpgradeBanner` (localStorage, cooldown 3 ngày)
- Query `profiles.social_links` của user hiện tại qua Supabase
- Hiển thị banner nếu: đã đăng nhập + `social_links` null/rỗng/mảng trống + chưa dismiss
- Style: `border-l-4 border-l-purple-400 bg-purple-50/50` + icon `Sparkles` từ lucide (phân biệt với banner bảo mật màu vàng)
- Nút CTA navigate đến `/profile` (trang cá nhân) để user gắn links trực tiếp trên avatar orbit

**2. Thêm banner vào Feed**
- `src/pages/Feed.tsx`: Đặt `<SocialLinkReminderBanner />` ngay dưới `<AccountUpgradeBanner />`
- Chỉ render khi `currentUserId` tồn tại

### Chi tiết kỹ thuật
- Files tạo mới: `src/components/profile/SocialLinkReminderBanner.tsx`
- Files sửa: `src/pages/Feed.tsx` (thêm 1 dòng import + 1 dòng render)
- Không cần thay đổi database

