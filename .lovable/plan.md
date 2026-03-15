

# Chỉnh lịch sử Gift: 7 ngày, nằm trên thanh header, hiển thị số lệnh

## Thay đổi

### 1. `GiftHistoryCalendar.tsx` — Giảm từ 30 → 7 ngày, hiển thị số lệnh giao dịch

- Đổi `generateLast30Days()` → `generateLast7Days()` (loop 7 thay vì 30)
- Bỏ label "Lịch sử 30 ngày", thay bằng inline compact hơn
- Mỗi ô ngày hiển thị thêm **số lệnh giao dịch** (từ `dateCounts`) bên dưới tên thứ, thay vì chỉ chấm nhỏ
- Bỏ horizontal scroll (7 ngày vừa đủ hiển thị không cần cuộn)

### 2. `GiftCelebrationGroup.tsx` — Đưa calendar lên trên header

- Di chuyển `<GiftHistoryCalendar>` lên **trên** phần header (Gift Celebration title), thay vì nằm dưới
- Giữ nguyên logic chọn ngày và data switching

### 3. `useGiftHistory.ts` — Giảm query range xuống 7 ngày

- Đổi `30 * 24 * 60 * 60 * 1000` → `7 * 24 * 60 * 60 * 1000` trong `fetchGiftDayCounts`

### Files cần sửa
1. `src/components/feed/GiftHistoryCalendar.tsx`
2. `src/components/feed/GiftCelebrationGroup.tsx`
3. `src/hooks/useGiftHistory.ts`

