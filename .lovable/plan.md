

# Fix: Số lệnh giao dịch hiển thị sai (0/1) cho các ngày cũ

## Nguyên nhân gốc

Supabase PostgREST có giới hạn tối đa **1000 rows** mỗi request, dù code đặt `.limit(5000)`. Tổng gift posts 7 ngày = ~2128 rows → chỉ nhận được 1000 rows mới nhất → các ngày cũ (10, 11, 12) bị thiếu dữ liệu → hiển thị 0/1.

## Giải pháp

Thay vì fetch tất cả rows rồi đếm client-side, **tạo database function** để đếm trực tiếp trong database (không bị giới hạn 1000 rows).

### 1. Tạo database function `get_gift_day_counts`
```sql
CREATE FUNCTION get_gift_day_counts()
RETURNS TABLE(vn_date date, count bigint)
-- Đếm gift_celebration posts theo ngày VN, 7 ngày gần nhất
```

### 2. Cập nhật `useGiftHistory.ts`
- Thay `fetchGiftDayCounts` từ fetch rows + đếm client → gọi RPC `get_gift_day_counts`
- Kết quả trả về đã là `{ date: count }` chính xác, không bị giới hạn 1000 rows

### 3. Tăng limit `fetchGiftPostsByDate`
- Khi nhấp vào ngày, tăng limit từ 100 → 500 để hiển thị đầy đủ lệnh giao dịch của ngày đó

