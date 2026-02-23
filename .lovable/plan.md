
# Thêm Nút Tìm Kiếm Email Trong Cột Email

## Mô Tả

Thêm một nút tìm kiếm nhỏ vào cột Email (chỉ hiện cho Admin). Khi nhấp vào, sẽ mở một popover/dropdown hiển thị danh sách tất cả email được sắp xếp theo thứ tự ABC, có ô tìm kiếm để lọc nhanh. Nhấp vào email sẽ tự động điền vào ô tìm kiếm chính để lọc bảng theo email đó.

## Chi Tiết Kỹ Thuật

### File: `src/pages/Users.tsx`

1. **Thêm state** `emailSearchOpen` để quản lý popover.

2. **Cập nhật header cột Email (dòng 134)**: Thêm nút Search icon bên cạnh chữ "Email". Khi nhấp sẽ mở Popover.

3. **Tạo Popover nội dung**:
   - Ô input tìm kiếm email riêng (lọc trong danh sách email).
   - Danh sách email sắp xếp A-Z (dùng ScrollArea để cuộn được).
   - Mỗi email là một dòng có thể nhấp. Khi nhấp:
     - Tự động điền email vào ô tìm kiếm chính (`setSearch`).
     - Đóng popover.

4. **Tạo danh sách email từ `allUsers`**: Lọc các email không null, sắp xếp alphabetically, loại trùng.

### File: `src/hooks/useUserDirectory.ts`

5. **Mở rộng logic tìm kiếm (dòng ~178)**: Thêm kiểm tra email vào bộ lọc search để khi admin nhập email vào ô tìm kiếm chính, kết quả hiện đúng user.

### Components sử dụng

- `Popover` + `PopoverTrigger` + `PopoverContent` (có sẵn trong dự án)
- `ScrollArea` (có sẵn)
- `Input` (có sẵn)
- Icon `Search` từ lucide-react (đã import)
