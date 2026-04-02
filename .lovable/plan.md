

## Đồng bộ giao diện Gift Card gọn gàng cho cả desktop và mobile

### Vấn đề
Hiện tại Gift Card dùng responsive classes (`sm:`) nên mobile gọn nhưng desktop vẫn lớn hơn. User muốn desktop cũng gọn như mobile.

### Thay đổi

**File: `src/components/feed/GiftCelebrationCard.tsx`**

1. **Avatar**: `w-10 h-10 sm:w-12 sm:h-12` → `w-10 h-10` (bỏ `sm:` variant)
2. **Tên truncate**: `max-w-[80px] sm:max-w-[120px]` → `max-w-[100px]` (giá trị thống nhất)
3. **Padding card**: `p-3 sm:p-4` → `p-3`
4. **Margin bottom**: `mb-2 sm:mb-3` → `mb-2`
5. **Gap**: `gap-2 sm:gap-3` → `gap-2`
6. **Font tiêu đề**: `text-base sm:text-lg` → `text-base`
7. **Gift message padding**: `px-2 py-1.5 sm:px-3 sm:py-2` → `px-2 py-1.5`, margin `mb-2 sm:mb-3` → `mb-2`
8. **Gift message font**: `text-xs sm:text-sm` → `text-sm` (thống nhất đọc được)
9. **Action buttons**: `py-2 sm:py-3 min-h-[40px] sm:min-h-[48px]` → `py-2 min-h-[40px]`
10. **Button text**: `text-xs sm:text-sm` → `text-sm`
11. **Card margin**: `mb-3 sm:mb-4` → `mb-3`

### Kết quả
Gift Card hiển thị gọn gàng đồng nhất trên cả mobile và desktop.

