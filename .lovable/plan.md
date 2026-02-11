

# Thêm Nút Xuất File Excel Báo Cáo

## Tổng quan
Thêm nút "Xuất Excel" vào trang Admin và trang Danh Sách Users, xuất file `.xls` (HTML table format - Excel mở được trực tiếp, không cần thêm thư viện).

---

## 1. Tạo tiện ích xuất Excel: `src/utils/exportExcel.ts`

Tạo file helper dùng chung, sử dụng HTML table format (Excel đọc được native):
- Hàm `exportToExcel(headers, rows, filename, sheetTitle)` 
- Tự động thêm BOM UTF-8 cho tiếng Việt
- Định dạng bảng đẹp với border, header nền vàng/xanh
- Hỗ trợ số, text, ngày tháng

---

## 2. Thêm nút "Xuất Excel" vào trang Danh Sách Users

### File: `src/pages/UserDirectory.tsx`
- Thêm nút "Xuất Excel" cạnh nút "Xuất CSV" hiện tại
- Icon: `FileSpreadsheet` (lucide-react)
- Gọi hàm `exportToExcel` với toàn bộ dữ liệu users đã lọc
- Tên file: `bao-cao-thanh-vien-YYYY-MM-DD.xls`

### File: `src/hooks/useUserDirectory.ts`
- Thêm hàm `exportExcel` vào hook, tương tự `exportCsv`

---

## 3. Thêm nút "Xuất Excel" vào trang Admin

### File: `src/pages/Admin.tsx`
- Thêm nút "Xuất Báo Cáo Excel" ở header, cạnh nút "Thoát"
- Xuất báo cáo tổng hợp gồm: danh sách users + thống kê cơ bản

---

## Tổng hợp file cần tạo/sửa

| File | Hành động |
|------|-----------|
| `src/utils/exportExcel.ts` | Tạo mới - helper xuất Excel dùng chung |
| `src/hooks/useUserDirectory.ts` | Thêm hàm `exportExcel` |
| `src/pages/UserDirectory.tsx` | Thêm nút "Xuất Excel" |
| `src/pages/Admin.tsx` | Thêm nút "Xuất Báo Cáo Excel" ở header |

