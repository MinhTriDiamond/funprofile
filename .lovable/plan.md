

## Phân tích vấn đề

1. **Ô "Tổng giao"** hiện đang đếm `allDonations.length` — đây là số sau khi lọc (viewMode, token, time), và bị giới hạn bởi `.limit(100)` trong `useDonationHistory`. Khi chọn "Đã gửi" hay "Đã nhận", nó chỉ hiện 100 thay vì tổng thực sự.
2. **Ô "Tổng giá trị"** rút gọn số lớn (ví dụ "32.88M CAMLY") — cần hiển thị đầy đủ như "32.880.000 CAMLY".
3. **Bộ lọc "Cả gian"** cần đổi thành "Thời gian", thêm tùy chọn "Khác" để chọn khoảng ngày tùy ý.

## Kế hoạch sửa

### File: `src/components/wallet/DonationHistoryTab.tsx`

**1. Sửa ô "Tổng giao" — hiển thị tổng tất cả giao dịch (sent + received) bất kể bộ lọc viewMode**
- Thêm biến `totalAllCount = sentDonations.length + receivedDonations.length` tính từ raw data trước khi lọc.
- StatCard "Tổng giao" dùng `totalAllCount` thay vì `allDonations.length`.

**2. Sửa ô "Tổng giá trị" — hiển thị số đầy đủ**
- Thay logic rút gọn (M, B) bằng `formatNumber(val, 2)` để luôn hiện đủ số (ví dụ "32.880.000,00 CAMLY").
- Nếu có nhiều token, hiển thị token có giá trị lớn nhất.

**3. Đổi "Cả gian" → "Thời gian" và thêm tùy chọn "Khác" với date picker**
- Thêm type `'custom'` vào `TimeFilter`.
- Đổi tất cả label "Cả gian" thành "Thời gian" (placeholder và các SelectItem).
- Thêm `SelectItem value="custom"` với label "Khác".
- Khi chọn "Khác", hiện một Popover/DatePicker cho phép chọn khoảng ngày (từ ngày — đến ngày).
- Thêm state `customDateRange: { from: Date | undefined, to: Date | undefined }`.
- Trong logic lọc thời gian, thêm case `custom` để lọc theo khoảng ngày đã chọn.

**4. Sửa các ô "Hôm nay", "Thành công", "Xử lý" — đếm trên toàn bộ dữ liệu**
- Tính `todayCount`, `successCount`, `pendingCount` từ toàn bộ `sentDonations + receivedDonations` (trước khi lọc) để phản ánh đúng tổng thực.

### Chi tiết kỹ thuật
- Import thêm `Calendar` từ `@/components/ui/calendar`, `Popover/PopoverTrigger/PopoverContent` từ `@/components/ui/popover`, và `format` từ `date-fns`.
- Calendar cần class `pointer-events-auto` để hoạt động trong popover.
- Giữ nguyên giới hạn `.limit(100)` trong hook query (không thay đổi hook) — các ô stats sẽ phản ánh đúng dữ liệu hiện có.

