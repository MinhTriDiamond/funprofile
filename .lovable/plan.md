

## Vấn đề

Lịch sử giao dịch hiện đang hiển thị các giao dịch từ ví ngoài (external) có từ trước khi người dùng đăng ký tài khoản FUN.RICH. Ví dụ: tài khoản `Lanchi68` đăng ký ngày **16/02/2026** nhưng hiển thị giao dịch từ **07/06/2025** — đây là các giao dịch blockchain cũ không liên quan đến FUN.RICH.

## Giải pháp

Lọc giao dịch theo ngày đăng ký tài khoản của người dùng (`profiles.created_at`). Chỉ hiển thị các giao dịch có `created_at >= ngày đăng ký`.

## Các bước thực hiện

### 1. Cập nhật hook `usePublicDonationHistory`
- Nhận thêm tham số `userCreatedAt` (ngày đăng ký tài khoản)
- Thêm điều kiện `.gte('created_at', userCreatedAt)` cho tất cả 3 truy vấn: `donations`, `swap_transactions`, `wallet_transfers`

### 2. Cập nhật RPC `get_user_donation_summary`
- Thêm điều kiện lọc theo `profiles.created_at` trong tất cả các CTE (donation_received, donation_sent, swap_in, swap_out, transfer_in, transfer_out)
- Đảm bảo bảng tổng kết cũng chỉ tính giao dịch sau ngày đăng ký

### 3. Cập nhật component `WalletTransactionHistory`
- Truyền `userCreatedAt` từ profile data vào hook
- Lấy `created_at` từ bảng `profiles` (có thể đã có sẵn hoặc cần fetch thêm)

### Chi tiết kỹ thuật

**File thay đổi:**
- `src/hooks/usePublicDonationHistory.ts` — thêm param `userCreatedAt`, thêm filter `.gte('created_at', ...)` cho cả 3 bảng
- `src/components/profile/WalletTransactionHistory.tsx` — truyền `userCreatedAt` vào hook
- Database migration — cập nhật RPC `get_user_donation_summary` thêm join với `profiles` để lấy `created_at` và lọc

