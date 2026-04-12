

## Kế hoạch: Thêm ô chọn (Select) user đối tác trong lịch sử giao dịch

### Vấn đề
Phần "Thống kê theo người dùng" đang ẩn trong mục thu gọn (Collapsible), user không thấy. Khi bấm vào avatar/tên trong danh sách giao dịch thì bị chuyển sang trang cá nhân thay vì lọc.

### Giải pháp
Thêm một **ô Select dropdown** "Chọn người dùng" ngay khu vực bộ lọc (cạnh dropdown Token), hiển thị danh sách tất cả user đã giao dịch cùng. Khi chọn 1 user → lọc giao dịch chỉ hiện với người đó + hiện tổng số lệnh tặng/nhận.

### Thay đổi

**File: `src/components/profile/WalletTransactionHistory.tsx`**

1. **Thêm Select dropdown "Người dùng"** ngay cạnh dropdown Token hiện có:
   - Dùng danh sách `userStats` (đã có logic tính toán) để tạo các option
   - Mỗi option hiện: tên user + tổng số lệnh (ví dụ: "angel_thuytram (5 lệnh)")
   - Giá trị mặc định: "Tất cả" (không lọc)
   - Khi chọn → set `userFilter` → danh sách giao dịch bên dưới chỉ hiện giao dịch với người đó

2. **Di chuyển logic `userStats`** từ bên trong `UserBreakdownSection` lên component cha (`WalletTransactionHistoryContent`) để dùng chung cho cả Select dropdown

3. **Giữ nguyên `UserBreakdownSection`** (Collapsible) để user vẫn xem được chi tiết tặng/nhận theo token nếu muốn, nhưng giờ có thêm ô Select dễ thấy hơn

4. **Đồng bộ 2 chiều**: Chọn user trong Select → highlight trong UserBreakdown, và ngược lại

### Kết quả
- User thấy ngay ô "Chọn người dùng" trên thanh lọc, không cần tìm mục ẩn
- Chọn 1 user → hiện tất cả giao dịch tặng/nhận với người đó
- Chọn "Tất cả" → hiện lại toàn bộ

