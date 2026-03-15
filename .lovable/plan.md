

# Cải thiện giao diện lịch sử quà tặng

## Thay đổi UI

### 1. `GiftHistoryCalendar.tsx`
- **Dòng 56**: Đổi "7 ngày" → "Lịch sử 7 ngày" và thêm màu vàng (`text-gold`)
- **Dòng 68**: Tăng `gap-1` → `gap-2` để các ô cách đều nhau hơn
- **Dòng 79**: Tăng padding ngang `px-0.5` → `px-2` để các ô có không gian đồng đều

### 2. `GiftCelebrationGroup.tsx`
- **Dòng 119**: Đổi màu chữ "Xem thêm" từ `text-muted-foreground` → `text-gold` với hover `hover:text-gold-hover`

## Kết quả
- Nút lịch hiển thị rõ ràng "Lịch sử 7 ngày" với màu vàng nổi bật
- Các ô ngày trong popover cách đều nhau, dễ nhìn hơn
- Nút "Xem thêm" màu vàng để thu hút chú ý

