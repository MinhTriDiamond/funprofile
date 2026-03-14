

# Fix: Gom TẤT CẢ gift posts vào 1 group (không chỉ liên tiếp)

## Vấn đề
Logic hiện tại trong `Feed.tsx` chỉ gom gift posts **liên tiếp**. Nếu gift posts bị xen kẽ bởi post thường (do highlighted posts xếp trước), mỗi gift sẽ hiển thị riêng lẻ — không có group wrapper.

## Giải pháp
Tách gift posts ra khỏi danh sách trước, hiển thị group ở đầu feed (nếu có), sau đó render các post thường bên dưới.

### File: `src/pages/Feed.tsx`
- Tách `posts` thành 2 mảng: `giftPosts` và `regularPosts`
- Render `GiftCelebrationGroup` ở đầu nếu có gift posts
- Render các post thường bên dưới bình thường

### File: `src/components/feed/GiftCelebrationGroup.tsx`
- Giảm `max-h` từ `1200px` xuống khoảng `900px` (~3 card vừa đủ hiện)
- Luôn hiện badge số lượng khi > 3

Không thay đổi `GiftCelebrationCard.tsx` (đã có nút "Xem thêm" rồi).

