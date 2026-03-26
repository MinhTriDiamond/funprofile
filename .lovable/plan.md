

## Thêm bộ lọc theo Ngày / Tháng / Năm vào bảng Danh sách nhận

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Thêm 3 bộ lọc Select** nằm cạnh ô tìm kiếm (trước nút PDF):
   - **Năm**: Dropdown liệt kê các năm có dữ liệu (vd: 2025, 2026), mặc định "Tất cả"
   - **Tháng**: Dropdown 1-12, mặc định "Tất cả" (chỉ hiện khi đã chọn năm)
   - **Ngày**: Dropdown 1-31 (tự điều chỉnh theo tháng), mặc định "Tất cả" (chỉ hiện khi đã chọn tháng)

2. **Logic lọc**: Sau khi lọc theo `search`, tiếp tục lọc theo năm/tháng/ngày dựa trên `created_at` (convert sang giờ VN trước khi so sánh)

3. **Cập nhật footer**: Tổng số bản ghi và tổng CAMLY phản ánh đúng kết quả sau khi lọc

4. **Bố cục**: Các Select nhỏ gọn (`w-[100px]`) nằm ngang cùng hàng với ô search và nút PDF

### Giao diện mới (hàng filter)
```text
[🔍 Tìm kiếm...              ] [Năm ▾] [Tháng ▾] [Ngày ▾] [📥 PDF]
```

### Chi tiết kỹ thuật
- State: `filterYear`, `filterMonth`, `filterDay` (string, default `'all'`)
- Danh sách năm tự động tính từ dữ liệu (`enrichedClaims`)
- Dùng `toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })` để lấy ngày/tháng/năm theo giờ VN
- Khi đổi năm → reset tháng và ngày; khi đổi tháng → reset ngày
- Số ngày trong dropdown tự điều chỉnh theo tháng/năm đã chọn (28/29/30/31)

