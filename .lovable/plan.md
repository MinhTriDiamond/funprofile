

# Fix: Hiển thị đầy đủ số lệnh giao dịch cho tất cả 30 ngày

## Nguyên nhân

1. **Query bị giới hạn 1000 rows**: Tổng số gift posts trong 30 ngày là ~4800. Query mặc định chỉ trả 1000 rows mới nhất → các ngày cũ (1-12) không được đếm → hiển thị 0.

2. **Bug `todayStr`**: Sau khi `.reverse()`, `days[0]` là ngày cũ nhất, không phải hôm nay → highlight sai ngày.

## Thay đổi

### 1. `useGiftHistory.ts` — Thêm `.limit(5000)`
- Dòng 32: thêm `.limit(5000)` vào query `fetchGiftDayCounts` để lấy đủ tất cả gift posts trong 30 ngày

### 2. `GiftHistoryCalendar.tsx` — Fix `todayStr`  
- Dòng 44: đổi `days[0]?.date` → `days[days.length - 1]?.date` (ngày cuối mảng = hôm nay)

