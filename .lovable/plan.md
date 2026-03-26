

## Thay bộ lọc Năm/Tháng/Ngày bằng chế độ xem theo kỳ

### Vấn đề
Nút "Tất cả" hiện tại là Select lọc theo Năm — khi bấm không hiện gì hoặc khó dùng. Người dùng muốn chọn chế độ xem: **Ngày / Tuần / Tháng / Tuỳ chọn** (tương tự bảng thống kê ContentStatsModal).

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Xoá 3 Select** (Năm, Tháng, Ngày) và các state `filterYear`, `filterMonth`, `filterDay`
2. **Thêm 1 Select chế độ xem** với 4 tuỳ chọn:
   - **Tất cả** — hiển thị toàn bộ (mặc định)
   - **Ngày** — hiện thêm date picker chọn 1 ngày cụ thể
   - **Tháng** — hiện 2 select nhỏ: Năm + Tháng
   - **Tuỳ chọn** — hiện 2 date picker: Từ ngày → Đến ngày

3. **Logic lọc**: Tuỳ theo chế độ, lọc `created_at` (giờ VN) theo khoảng thời gian tương ứng

4. **Bố cục hàng filter**:
```text
[🔍 Tìm kiếm...] [Tất cả ▾] [controls tuỳ chế độ] [📥 PDF]
```

### Chi tiết kỹ thuật
- State: `viewMode` (`'all' | 'day' | 'month' | 'custom'`), `selectedDate`, `selectedYear`, `selectedMonth`, `customFrom`, `customTo`
- Dùng `getVNDateParts()` (đã có) để so sánh theo giờ VN
- Khi chọn "Tất cả" → không lọc gì thêm
- Khi chọn "Ngày" → hiện input date, lọc theo ngày VN
- Khi chọn "Tháng" → hiện select Năm + Tháng, lọc theo tháng VN
- Khi chọn "Tuỳ chọn" → hiện 2 input date (từ-đến), lọc theo khoảng

