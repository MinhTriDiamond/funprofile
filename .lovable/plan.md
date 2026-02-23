
# Thêm Nút Sắp Xếp A-Z Cho Cột "Người dùng" và "Email"

## Mô Tả

Thêm nút sắp xếp (sort) vào header cột **Người dùng** và **Email** để admin có thể sắp xếp danh sách theo thứ tự A-Z hoặc Z-A. Giúp dễ dàng phát hiện các tài khoản có tên hoặc email giống nhau hàng loạt.

## Thay Đổi

### File: `src/hooks/useUserDirectory.ts`

1. **Thêm state `sortBy`** với các giá trị: `'default'`, `'username-asc'`, `'username-desc'`, `'email-asc'`, `'email-desc'`.
2. **Thêm logic sắp xếp** vào `filtered` (sau khi lọc, trước khi phân trang): sắp xếp theo username hoặc email tuỳ `sortBy`.
3. **Export `sortBy` và `setSortBy`** ra ngoài.

### File: `src/pages/Users.tsx`

1. **Import icon `ArrowUpDown`** từ lucide-react.
2. **Cột "Người dùng"**: Thêm nút nhỏ bên cạnh text header. Nhấp sẽ chuyển đổi giữa A-Z / Z-A / mặc định.
3. **Cột "Email"** (chỉ admin): Thêm nút sắp xếp tương tự bên cạnh nút tìm kiếm hiện có.
4. Hiển thị mũi tên lên/xuống để biết đang sắp xếp theo hướng nào.

## Luồng Hoạt Động

- Nhấp lần 1: Sắp xếp A -> Z
- Nhấp lần 2: Sắp xếp Z -> A  
- Nhấp lần 3: Về mặc định (không sắp xếp)
- Khi sắp xếp theo username thì bỏ sắp xếp email và ngược lại
