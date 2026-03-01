
# Thêm tính năng click xem avatar phóng to

## Mô tả

Tạo component `AvatarViewer` dùng Dialog để hiển thị avatar full-size khi user click vào. Áp dụng cho các vị trí chính hiển thị avatar.

## Chi tiết kỹ thuật

### 1. Tạo component `src/components/ui/AvatarViewer.tsx`

Component mới sử dụng Dialog (tương tự `ImageViewer` đã có trong feed) để hiển thị avatar phóng to:
- Props: `imageUrl`, `isOpen`, `onClose`, `fallbackText`
- Hiển thị ảnh full-size trong Dialog tối (dark background)
- Nếu không có ảnh, hiển thị fallback text lớn
- Nút X để đóng

### 2. Cập nhật `src/pages/Profile.tsx` - Avatar trên trang profile

Thêm click handler cho avatar khi xem profile người khác (block `else` ở dòng 507-521):
- Wrap avatar trong button có cursor-pointer
- Click mở AvatarViewer dialog hiển thị avatar full-size
- Chỉ áp dụng khi xem profile người khác (không phải owner đang edit)

### 3. Cập nhật `src/components/reels/ReelInfo.tsx` - Avatar trong reels

- Thêm long-press hoặc click riêng để xem avatar (giữ click navigate profile như cũ)
- Hoặc đơn giản hơn: click avatar mở viewer, click username navigate profile

### 4. Cập nhật các vị trí phổ biến khác

- `src/pages/Leaderboard.tsx` - Avatar trong bảng xếp hạng
- `src/pages/Benefactors.tsx` - Avatar donor/recipient
- `src/components/chat/MessageBubble.tsx` - Avatar trong chat
- `src/components/wallet/DonationHistoryItem.tsx` - Avatar lịch sử donate

Ở các vị trí này, avatar nhỏ nên ưu tiên giữ hành vi navigate profile, không thêm viewer để tránh conflict UX.

## Phạm vi thay đổi

| Tệp | Thay đổi |
|------|----------|
| `src/components/ui/AvatarViewer.tsx` | Tạo mới - Dialog xem avatar phóng to |
| `src/pages/Profile.tsx` | Thêm click xem avatar cho profile người khác |
| `src/components/reels/ReelInfo.tsx` | Thêm click xem avatar trong reels |

Giữ đơn giản: chỉ áp dụng ở Profile page (nơi avatar lớn, user muốn xem rõ) và Reels (nơi avatar nổi bật). Các vị trí khác avatar quá nhỏ, click đã navigate profile.
