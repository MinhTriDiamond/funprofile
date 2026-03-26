
Mình sẽ sửa `src/components/feed/ClaimHistoryModal.tsx` để bộ lọc “Ngày” thực sự ra dữ liệu đúng ngày và dễ dùng hơn.

### Nguyên nhân chính
Hiện tại có 2 điểm làm người dùng bấm vào “Ngày” nhưng tưởng như không có chi tiết:

1. `selectedDate` đang mặc định là `new Date()` (ngày hiện tại), nên nếu hôm nay không có claim thì bảng sẽ trống ngay
2. Logic lọc `day/week/custom` đang trộn `Date` theo múi giờ máy với dữ liệu chuẩn giờ Việt Nam, nên có thể lệch ngày khi so sánh

### Kế hoạch cập nhật

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Đổi ngày mặc định sang ngày claim mới nhất có dữ liệu**
   - Khi modal mở hoặc khi dữ liệu `claims` tải xong, tự lấy `created_at` mới nhất
   - Gán `selectedDate`, `selectedYear`, `selectedMonth` theo **giờ Việt Nam**
   - Kết quả: chọn “Ngày” sẽ ra dữ liệu thật ngay, không bị rơi vào ngày trống

2. **Chuẩn hoá toàn bộ lọc theo giờ Việt Nam**
   - Giữ `getVNDateParts()`
   - Thêm helper tạo key ngày VN kiểu `yyyy-mm-dd`
   - Sửa lọc:
     - `day`: so sánh bằng key ngày VN
     - `week`: tính đầu tuần/cuối tuần theo ngày VN, không dùng so sánh `Date` local trực tiếp
     - `custom`: lọc theo khoảng ngày VN từ `from` đến `to`
   - Mục tiêu: bấm chọn ngày nào thì ra đúng dữ liệu của ngày đó

3. **Khi đổi chế độ lọc, tự set giá trị hợp lý**
   - `Ngày` → nhảy về ngày có claim gần nhất
   - `Tuần` → lấy tuần chứa ngày claim gần nhất
   - `Tháng` → lấy tháng có claim gần nhất
   - `Tuỳ chọn` → có thể gợi ý khoảng từ ngày claim gần nhất hoặc giữ trống
   - Tránh cảm giác “bấm vào mà không thấy gì”

4. **Cải thiện trạng thái rỗng**
   - Nếu ngày/tuần/tháng đang chọn không có claim, hiển thị thông báo rõ:
     - ví dụ: “Không có lịch sử claim trong ngày 11/03/2026”
   - Giúp người dùng hiểu là đã lọc đúng, chỉ là ngày đó chưa có dữ liệu

5. **Giữ nguyên UI đang có**
   - Không đổi bố cục filter hiện tại
   - Chỉ sửa logic chọn ngày và cách lọc để thao tác “Ngày” hoạt động đúng

### Kết quả mong đợi
- Chọn “Ngày” sẽ hiện dữ liệu ngay thay vì trắng trơn
- Chọn một ngày cụ thể sẽ lọc đúng theo giờ Việt Nam
- Không còn lỗi lệch ngày do timezone
- Nếu không có dữ liệu, modal sẽ báo rõ là ngày đang chọn không có claim
