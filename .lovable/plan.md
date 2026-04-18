
## Vấn đề
Hiện tại khi chọn user ở filter (Popover), bảng "Tổng nhận / Lệnh / Tổng đã tặng" và các tab "Tất cả / Đã nhận / Đã tặng" vẫn hiển thị tổng của TẤT CẢ giao dịch, không lọc theo user đã chọn. Cha muốn: khi chọn 1 user → toàn bộ số liệu (token breakdown, tổng GD, danh sách GD theo tab) chỉ tính riêng các giao dịch giữa Cha ↔ user đó.

## Hướng sửa (trong `src/components/profile/WalletTransactionHistory.tsx`)

### 1. Lọc dữ liệu theo `selectedUserId`
Tạo `filteredDonations` từ `donations` (đã có sẵn), khi `selectedUserId` ≠ null:
- Loại `swap` (vì swap không có counterparty user) → ẩn hoặc giữ tùy filter, mặc định ẩn khi đang lọc theo user.
- `donation`: giữ record nếu `sender_id === selectedUserId` HOẶC `recipient_id === selectedUserId`.
- `transfer`: giữ nếu `counterparty_address` khớp ví của selected user (cần map userId → wallet addresses từ `userStats` hoặc bỏ qua transfer khi lọc user).

### 2. Tính lại bảng token breakdown từ `filteredDonations`
Thay vì dùng `summary` (toàn cục từ RPC), tạo `displaySummary` = `useMemo`:
- Nếu `selectedUserId` null → dùng `summary` cũ (giữ nguyên perf).
- Nếu có user → tính breakdown 4 token (USDT/FUN/CAMLY/BTC) từ `filteredDonations` theo cùng logic `computeSummaryFromDonations` đã có trong hook.

### 3. Tính lại counter "Nhận / Gửi / Tổng GD"
- Khi lọc user → đếm từ `filteredDonations`.
- Cập nhật chip "Đang lọc: @username" giữ nguyên (đã có).

### 4. Áp filter vào danh sách hiển thị
Danh sách render hiện tại dùng `donations` trực tiếp; chuyển sang dùng `displayDonations` (= `filteredDonations` khi có user, ngược lại = `donations`). Tab "Tất cả/Đã nhận/Đã tặng" vẫn hoạt động trên tập đã lọc.

### 5. Ghi chú UX
- Khi đang lọc user, ẩn dòng `swap` trong bảng + hiện hint nhỏ "Chỉ hiển thị giao dịch tặng/nhận với user này" để Cha hiểu tại sao swap không có.

## Phạm vi file
- Chỉ sửa `src/components/profile/WalletTransactionHistory.tsx` (thêm `useMemo` tính `filteredDonations` + `displaySummary` + `displayCounters`, thay nguồn dữ liệu render).
- Không đụng `usePublicDonationHistory` để giữ logic fetch/summary toàn cục nguyên vẹn.
