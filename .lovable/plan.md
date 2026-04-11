

## Kế hoạch: Thêm nút xuất PDF vào lịch sử ví và lịch sử giao dịch cá nhân

### Tổng quan
Thêm nút xuất PDF vào 3 component lịch sử, tối ưu giao diện cho điện thoại.

### Các file cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/wallet/tabs/HistoryTab.tsx` | Thêm nút "Xuất PDF" bên cạnh nút refresh ở phần tiêu đề |
| `src/components/profile/WalletTransactionHistory.tsx` | Thêm nút "Xuất PDF" trong dialog header |
| `src/components/wallet/DonationHistoryTab.tsx` | Thêm nút "Xuất PDF" bên cạnh nút "Xuất dữ liệu" hiện tại |
| `src/utils/exportDonations.ts` | Cập nhật hàm `exportDonationsToPDF` để hỗ trợ kiểu dữ liệu từ `usePublicDonationHistory` (khác với `useDonationHistory`) |

### Chi tiết

**1. HistoryTab.tsx** (tab Lịch Sử trong ví)
- Import `Download` icon và `exportDonationsToPDF`
- Thêm nút PDF nhỏ gọn bên cạnh nút refresh trong tiêu đề
- Sử dụng `donations` (dữ liệu hiện tại) để xuất
- Trên mobile: chỉ hiện icon, ẩn chữ

**2. WalletTransactionHistory.tsx** (dialog lịch sử trên trang cá nhân)
- Thêm nút PDF trong dialog header, bên cạnh nút refresh
- Sử dụng `donations` từ `usePublicDonationHistory`
- Trên mobile: icon nhỏ gọn

**3. DonationHistoryTab.tsx** (tab lịch sử giao dịch trong wallet center)
- Thêm nút PDF bên cạnh nút CSV hiện có
- Sử dụng `exportDonationsToPDF` với `allDonations`

**4. exportDonations.ts**
- Tạo thêm hàm `exportPublicDonationsToPDF` hỗ trợ kiểu `DonationRecord` từ `usePublicDonationHistory` (có trường `sender_username`, `recipient_username` thay vì `sender.username`, `recipient.username`)
- Hoặc cập nhật hàm hiện có để xử lý cả 2 kiểu dữ liệu

### Responsive (điện thoại)
- Nút xuất PDF dùng `hidden sm:inline` cho text, chỉ hiện icon trên mobile
- Kích thước nút `size="sm"` hoặc `size="icon"` trên mobile

