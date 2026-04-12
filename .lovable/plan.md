

## Kế hoạch: Thêm bảng thống kê giao dịch theo từng người dùng

### Mục tiêu
Trong lịch sử giao dịch cá nhân, thêm một phần **"Thống kê theo người dùng"** hiển thị tổng hợp giao dịch giữa chủ profile và từng người đối tác. Ví dụ: angelaivan → angel_thuytram: 5 lệnh, 100 USDT + 0.5 BNB.

### Thay đổi

**File: `src/components/profile/WalletTransactionHistory.tsx`**

1. **Tạo component `UserBreakdownSection`:**
   - Nhận danh sách `donations` và `userId` hiện tại
   - Gom nhóm giao dịch theo `sender_id` / `recipient_id` (người đối tác)
   - Với mỗi người đối tác, tính:
     - Tổng số lệnh đã gửi cho họ + tổng số tiền theo từng token
     - Tổng số lệnh đã nhận từ họ + tổng số tiền theo từng token
   - Hiển thị danh sách dạng card có avatar + tên người dùng, có thể mở rộng/thu gọn
   - Sắp xếp theo tổng số lệnh giao dịch giảm dần

2. **Giao diện mỗi user card:**
   - Avatar + tên hiển thị (bấm vào đi tới profile)
   - Dòng tóm tắt: "Đã tặng: 3 lệnh (50 USDT, 0.1 BNB) | Đã nhận: 2 lệnh (30 USDT)"
   - Bấm vào card → tự động lọc danh sách giao dịch bên dưới chỉ hiện giao dịch với người đó (thêm state `userFilter`)

3. **Tích hợp vào dialog chính:**
   - Đặt phần "Thống kê theo người dùng" ngay dưới `SummaryTable`, trước danh sách giao dịch
   - Có thể thu gọn/mở rộng (mặc định thu gọn để không chiếm quá nhiều không gian)
   - Khi bấm vào 1 user → set `userFilter` → danh sách giao dịch bên dưới chỉ hiện giao dịch với user đó
   - Hiển thị badge "Đang lọc: @username ✕" để user biết đang lọc và có thể bỏ lọc

4. **Lọc giao dịch theo user:**
   - Thêm state `userFilter: string | null` (chứa userId của người đối tác)
   - Áp dụng filter lên danh sách `donations` khi render, kết hợp với `tokenFilter` hiện có
   - Bấm lại user đang chọn hoặc bấm ✕ → bỏ lọc

### Kết quả
- User mở lịch sử giao dịch → thấy bảng tổng hợp theo token (như hiện tại) + thêm phần thống kê theo người dùng
- Nhấp vào tên người dùng → lọc chỉ hiện giao dịch với người đó
- Dễ dàng biết đã giao dịch bao nhiêu lệnh, bao nhiêu tiền với từng người

