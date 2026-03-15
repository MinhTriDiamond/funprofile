

# Fix: Thứ tự ngày & hiển thị đầy đủ số lệnh giao dịch

## Vấn đề phát hiện

1. **Bug `todayStr`**: Sau khi `.reverse()`, `days[0]` là ngày cũ nhất chứ không phải hôm nay → highlight sai ngày hôm nay. Cần đổi thành `days[days.length - 1]`.

2. **Giới hạn 1000 rows**: Query `fetchGiftDayCounts` không có `.limit()` nên mặc định Supabase trả tối đa 1000 rows. Nếu có hơn 1000 gift trong 30 ngày, các ngày cũ sẽ bị thiếu count. Cần thêm `.limit(5000)` hoặc dùng phân trang.

## Thay đổi

### 1. `GiftHistoryCalendar.tsx`
- Sửa `todayStr = days[days.length - 1]?.date` (ngày cuối mảng sau reverse = hôm nay)

### 2. `useGiftHistory.ts`  
- Thêm `.limit(5000)` vào query `fetchGiftDayCounts` để đảm bảo lấy đủ tất cả gift posts trong 30 ngày
- Đảm bảo mọi ngày từ ngày 1 tháng đến hôm nay đều có count chính xác

