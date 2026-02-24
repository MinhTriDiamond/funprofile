
# Sửa lỗi trắng trang khi nhấp vào tab "Hệ thống" trong Admin

## Nguyên nhân
Trong file `AllTransactions.tsx` (component được hiển thị trong tab Hệ thống), có 2 dropdown filter sử dụng `<SelectItem value="">` -- giá trị rỗng `""` không được phép trong Radix UI Select. Lỗi này khiến React crash toàn bộ trang thành màn hình trắng.

## Giải pháp
Thay `value=""` bằng `value="all"` cho cả 2 SelectItem "Tất cả", và cập nhật logic lọc để xử lý giá trị `"all"` thay vì chuỗi rỗng.

## Chi tiết kỹ thuật

### File: `src/components/admin/AllTransactions.tsx`

**Thay doi 1 (dong 59):** `<SelectItem value="">Tất cả</SelectItem>` thanh `<SelectItem value="all">Tất cả</SelectItem>`

**Thay doi 2 (dong 73):** `<SelectItem value="">Tất cả</SelectItem>` thanh `<SelectItem value="all">Tất cả</SelectItem>`

**Thay doi 3:** Cap nhat gia tri mac dinh cua `statusFilter` va `tokenFilter` tu `""` thanh `"all"`, va cap nhat logic loc de kiem tra `"all"` thay vi chuoi rong.
