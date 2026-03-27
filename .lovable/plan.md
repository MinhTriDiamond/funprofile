

## Thêm thông báo hướng dẫn user mới gắn liên kết mạng xã hội

### Ý tưởng
Khi user mới đăng ký xong và đăng nhập lần đầu, hiển thị một **dialog/modal chào mừng** hướng dẫn họ vào trang cá nhân để gắn liên kết mạng xã hội. Khác với `SocialLinkReminderBanner` (hiện nhỏ trong feed), đây là popup nổi bật hơn, chỉ hiện **1 lần duy nhất** cho user mới.

### Cách hoạt động

```text
User mới đăng ký → Đăng nhập lần đầu
       ↓
Kiểm tra localStorage key "new_user_social_guide_shown"
       ↓
Chưa hiện → Hiển thị Dialog chào mừng
       ↓
User bấm "Đi tới trang cá nhân" → navigate('/profile') + đánh dấu đã hiện
User bấm "Để sau" → đóng dialog + đánh dấu đã hiện
```

### Các file cần tạo/sửa

#### 1. Tạo `src/components/onboarding/NewUserSocialGuideDialog.tsx`
- Dialog modal đẹp với icon, thông điệp chào mừng
- Nút "Đi tới trang cá nhân" → navigate `/profile`
- Nút "Để sau" → đóng dialog
- Chỉ hiện khi `localStorage` chưa có key `new_user_social_guide_shown`
- Chỉ hiện cho user đã đăng nhập + chưa có social_links

#### 2. Sửa `src/pages/Feed.tsx`
- Import và render `NewUserSocialGuideDialog`

#### 3. Sửa `src/i18n/translations.ts`
- Thêm translation keys cho EN và VI:
  - `newUserWelcomeTitle`: "Chào mừng bạn đến Fun.Rich!" / "Welcome to Fun.Rich!"
  - `newUserSocialGuideMessage`: hướng dẫn gắn liên kết
  - `goToProfile`: "Đi tới trang cá nhân"

### Giao diện Dialog
- Icon Sparkles lớn ở trên
- Tiêu đề chào mừng
- Mô tả ngắn gọn hướng dẫn vào profile gắn link
- 2 nút: CTA chính + Để sau
- Chỉ hiện **1 lần duy nhất** (localStorage flag)

