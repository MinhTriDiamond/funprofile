

# Tối ưu hiển thị Gift Celebration trên Feed

## 1. Gom gift cards vào container cuộn (hiện 3 card, cuộn xem thêm)

Hiện tại gift cards nằm xen kẽ với bài post thường trong feed. Cần tách các gift cards liên tiếp thành một nhóm riêng, hiển thị tối đa 3 card, phần còn lại cuộn được bên trong container.

**Cách làm:**
- Tạo component mới `GiftCelebrationGroup` bọc các gift card liên tiếp.
- Container có chiều cao cố định (khoảng 3 card, ~max-h-[1200px]) với `overflow-y-auto` và thanh cuộn mượt.
- Header nhỏ "🎁 Gift Celebration" + badge số lượng nếu > 3.
- Trong `Feed.tsx`: nhóm các post liên tiếp có `post_type === 'gift_celebration'` lại, render qua `GiftCelebrationGroup` thay vì từng card riêng lẻ.

## 2. Tin nhắn dài có nút "Xem thêm" trong GiftCelebrationCard

Hiện tại tin nhắn bị cắt ở 120 ký tự và không có cách xem toàn bộ.

**Cách làm:**
- Thêm state `showFullMessage` trong `GiftCelebrationCard`.
- Nếu `gift_message.length > 120`: hiển thị bản cắt + nút "Xem thêm" nhỏ bên dưới.
- Nhấn vào thì mở rộng hiển thị toàn bộ tin nhắn, nút đổi thành "Thu gọn".

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/feed/GiftCelebrationGroup.tsx` | Tạo mới — container cuộn cho nhóm gift cards |
| `src/components/feed/GiftCelebrationCard.tsx` | Thêm nút "Xem thêm / Thu gọn" cho tin nhắn dài |
| `src/pages/Feed.tsx` | Nhóm gift posts liên tiếp, render qua `GiftCelebrationGroup` |

