

# Cải thiện màu sắc và layout header Gift Celebration

## Thay đổi

### 1. `GiftHistoryCalendar.tsx`
- **Dòng 56**: Đổi màu chữ "Lịch sử 7 ngày" từ `text-[#FFD700]` (vàng) → `text-pink-600 font-semibold text-sm` (hồng đậm, font to hơn)
- **Dòng 54**: Tăng kích thước nút trigger: `text-xs` → `text-sm`
- **Dòng 92-97**: Đổi màu số lượng gift từ emerald → hồng đậm (`text-pink-600`)

### 2. `GiftCelebrationGroup.tsx`
- **Dòng 62**: Thêm `justify-between` và điều chỉnh gap để 4 mục cách đều: icon Gift, nút âm thanh, lịch sử, số lượng
- **Dòng 66-76**: Bọc nút âm thanh trong `<div className="flex items-center gap-2">` để nhóm với icon Gift
- **Dòng 78-82**: Bọc GiftHistoryCalendar trong div riêng
- **Dòng 84-86**: Đổi màu "335 gifts" từ `text-muted-foreground` → `text-pink-600 font-semibold`
- **Dòng 115-127**: Thêm logic hiển thị nút "Thu gọn" khi `visibleCount > INITIAL_VISIBLE`, màu hồng đậm giống "Xem thêm"

## Kết quả
- Chữ "Lịch sử 7 ngày" và số lượng gift hiển thị màu hồng đậm (#db2777)
- Font chữ to rõ ràng hơn (text-sm thay vì text-xs)
- 4 mục trong header cách đều nhau với `justify-between`
- Nút "Xem thêm" / "Thu gọn" xen kẽ tùy trạng thái hiển thị

