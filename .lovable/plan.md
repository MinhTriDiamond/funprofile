

# Giới hạn Gift Celebration hiển thị 3 card, bỏ cuộn tự do

## Vấn đề
- Container có `max-h-[750px] overflow-y-auto` → khi lướt chuột/tay qua vùng gift, nó cuộn bên trong và load nhiều card
- `INITIAL_VISIBLE = 5` vẫn quá nhiều

## Thay đổi — `src/components/feed/GiftCelebrationGroup.tsx`

1. Giảm `INITIAL_VISIBLE` từ 5 xuống **3**
2. **Bỏ `overflow-y-auto` và `max-h`** trên container → không còn cuộn bên trong, tránh việc lướt tay vô tình cuộn gift
3. Giữ nút "Xem thêm" bên dưới để user chủ động bấm xem thêm (mỗi lần thêm 3 card)
4. Giảm `LOAD_MORE_COUNT` từ 5 xuống **3**

Kết quả: Mặc định chỉ hiện 3 gift card, không cuộn nội bộ, user muốn xem thêm thì bấm nút.

