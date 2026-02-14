
# Sắp Xếp Danh Sách User Theo Thứ Tự ABC

## Thay Đổi

Thêm tùy chọn sắp xếp theo bảng chữ cái (A-Z) vào danh sách duyệt thưởng, và đặt nó làm **mặc định**.

### File cần sửa: `src/components/admin/RewardApprovalTab.tsx`

1. **Thêm tùy chọn sort mới**: Mở rộng `sortBy` state từ 3 giá trị sang 4:
   - `"alpha_asc"` (A-Z) -- **mặc định mới**
   - `"claimable_desc"` (Claimable cao nhất)
   - `"claimable_asc"` (Claimable thấp nhất)
   - `"total_desc"` (Total cao nhất)

2. **Cập nhật logic sort**: Thêm case `"alpha_asc"` sử dụng `localeCompare('vi')` để sắp xếp đúng tiếng Việt (có dấu).

3. **Cập nhật nút Sort**: Hiển thị label "A-Z" khi đang ở chế độ sắp xếp ABC, và xoay vòng qua 4 tùy chọn khi nhấn.

### Chi tiết kỹ thuật

- Giá trị mặc định `sortBy` đổi từ `"claimable_desc"` sang `"alpha_asc"`
- Sort logic dùng `a.username.localeCompare(b.username, 'vi')` để hỗ trợ tiếng Việt
- Nút sort xoay vòng: A-Z -> Claimable cao -> Claimable thấp -> Total cao -> quay lại A-Z
