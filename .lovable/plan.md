
## Sửa bộ lọc để bấm vào thấy menu chọn đầy đủ

### Vấn đề hiện tại
Có 2 lỗi đang chồng lên nhau trong `src/components/feed/ClaimHistoryModal.tsx`:

1. **Menu Select/Calendar trong Dialog không nổi lên đúng lớp** nên bấm vào nhưng danh sách không hiện rõ để chọn
2. Bộ lọc hiện chỉ có `Tất cả / Ngày / Tháng / Tuỳ chọn`, **chưa có `Tuần`** như yêu cầu trước đó

### Kế hoạch chỉnh sửa

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Sửa lớp hiển thị của dropdown trong dialog**
   - Thêm `className="pointer-events-auto z-[9999]"` cho `SelectContent`
   - Thêm `className="w-auto p-0 z-[9999]"` cho các `PopoverContent`
   - Mục tiêu: khi bấm vào nút lọc, menu và lịch sẽ nổi lên trên dialog, không bị ẩn hoặc không bấm được

2. **Bổ sung chế độ `Tuần` vào bộ lọc**
   - Mở rộng `viewMode` thành: `'all' | 'day' | 'week' | 'month' | 'custom'`
   - Thêm option `Tuần` trong Select chính

3. **Hiển thị control tương ứng theo từng chế độ**
   - `Tất cả`: không hiện thêm control phụ
   - `Ngày`: hiện 1 date picker
   - `Tuần`: hiện 1 date picker để chọn ngày bất kỳ trong tuần, sau đó tự lọc toàn bộ tuần đó
   - `Tháng`: hiện chọn năm + tháng
   - `Tuỳ chọn`: hiện từ ngày / đến ngày

4. **Cập nhật logic lọc dữ liệu**
   - Giữ chuẩn múi giờ Việt Nam như code hiện tại
   - Với `Tuần`: tính đầu tuần/cuối tuần theo ngày đã chọn rồi lọc các bản ghi nằm trong khoảng đó
   - Với `Tuỳ chọn`: giữ lọc theo khoảng ngày như hiện có

5. **Giữ bố cục gọn đẹp**
   - Hàng filter vẫn theo dạng:
```text
[Tìm kiếm] [Tất cả/Ngày/Tuần/Tháng/Tuỳ chọn] [control phụ] [PDF]
```
   - Chiều rộng nút lọc sẽ tăng nhẹ để nhìn rõ nhãn hơn và tránh cảm giác bị cụt

### Kết quả mong đợi
- Bấm vào nút bộ lọc sẽ **hiện menu chọn ngay**
- Người dùng sẽ thấy đủ các lựa chọn: **Tất cả / Ngày / Tuần / Tháng / Tuỳ chọn**
- Calendar và dropdown đều thao tác được bình thường ngay trong modal
