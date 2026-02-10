
# Thêm Liên Kết Profile Cho @username

## Tổng Quan

Hiện tại, @username trong các card chúc mừng (gửi/nhận) và lịch sử giao dịch chỉ hiển thị dạng text tĩnh. Sẽ biến chúng thành link click được, điều hướng đến `/profile/:userId`.

## Thay Đổi

### 1. `GiftCelebrationModal.tsx` -- Thêm link cho sender & recipient username

**Cần thêm:**
- Import `useNavigate` từ `react-router-dom`
- Thêm `senderId` và `recipientId` vào interface `GiftCardData`
- Dòng 255 (`@{data.senderUsername}`): wrap trong thẻ `<button>` hoặc `<span>` có `onClick={() => navigate('/profile/' + data.senderId)}`
- Dòng 280 (`@{data.recipientUsername}`): tương tự, navigate đến profile recipient
- Style: thêm `cursor-pointer hover:underline text-primary` để user biết đây là link

### 2. `DonationReceivedCard.tsx` -- Thêm link cho sender username

- Dòng 147 (`@{data.senderUsername}`): wrap trong `<button>` có `onClick` navigate đến `/profile/${data.senderId}`
- Component đã import `useNavigate` sẵn, và đã có `data.senderId` trong interface
- Style: `cursor-pointer hover:underline`

### 3. `DonationHistoryItem.tsx` -- Thêm link cho @username

**Cần thêm:**
- Import `useNavigate` từ `react-router-dom`
- Dòng 40 (`@{otherUser?.username}`): wrap trong `<button>` có `onClick` navigate đến `/profile/${otherUser?.id}`
- Quan trọng: cần `stopPropagation()` để click vào username không trigger `onClick` của card cha (card cha mở celebration modal)
- Style: `text-primary hover:underline cursor-pointer`

### 4. `DonationHistoryTab.tsx` -- Truyền thêm ID vào GiftCelebrationModal

Khi truyền data cho `GiftCelebrationModal` (dòng 120-135), thêm:
- `senderId: selectedDonation.sender?.id`
- `recipientId: selectedDonation.recipient?.id`

## Tóm Tắt Files

| File | Hành động | Chi tiết |
|------|-----------|----------|
| `GiftCelebrationModal.tsx` | Sửa | Thêm `senderId`, `recipientId` vào interface; wrap @username thành link navigable |
| `DonationReceivedCard.tsx` | Sửa nhỏ | Wrap @senderUsername thành link (đã có senderId + useNavigate) |
| `DonationHistoryItem.tsx` | Sửa | Import useNavigate, wrap @username thành link với stopPropagation |
| `DonationHistoryTab.tsx` | Sửa nhỏ | Truyền thêm senderId, recipientId vào GiftCelebrationModal data |
