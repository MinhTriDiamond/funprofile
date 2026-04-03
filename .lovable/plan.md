

# Tăng kích cỡ logo đồng tiền BTC nhảy múa lên gấp đôi

## Thay đổi

### File: `src/components/feed/GiftCelebrationCard.tsx`

Nhân đôi giá trị `size` của tất cả 16 đồng tiền trong mảng `FLOATING_COINS` (dòng 24-46):

| Hiện tại | Sau khi sửa |
|----------|-------------|
| 18 | 36 |
| 14 | 28 |
| 20 | 40 |
| 24 | 48 |
| 16 | 32 |
| 12 | 24 |
| 22 | 44 |
| 26 | 52 |

Chỉ thay đổi thuộc tính `size`, giữ nguyên vị trí (`top`, `left`, `right`), `delay`, và animation.

