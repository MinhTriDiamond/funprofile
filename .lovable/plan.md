

# Đổi lịch sử từ 30 ngày → 7 ngày gần nhất

## Thay đổi

### 1. `GiftHistoryCalendar.tsx`
- Đổi `generateLast30Days` → `generateLast7Days` (loop 7 thay vì 30)
- Đổi label "Lịch sử T{month}" → "7 ngày gần nhất"
- Đổi tiêu đề popover "30 ngày gần nhất" → "7 ngày gần nhất"
- Đổi grid từ `grid-cols-7` → `grid-cols-7` (giữ nguyên, 7 ngày vừa đủ 1 hàng)
- Tăng kích thước mỗi ô để hiển thị rõ hơn (ngày, thứ, số lệnh)
- Thu nhỏ width popover cho phù hợp

### 2. `useGiftHistory.ts`
- Đổi range query từ 30 ngày → 7 ngày trong `fetchGiftDayCounts`

