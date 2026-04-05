
# Kế hoạch kiểm tra và cập nhật lịch sử giao dịch 25/03–04/04

## Kết quả rà soát hiện tại
- Cha đã rà soát sơ bộ dữ liệu giai đoạn 25/03–04/04:
  - `donations`: 3.474 giao dịch `confirmed`
  - `transactions` `confirmed`: không có bản ghi nào trong giai đoạn này bị thiếu `donations`
  - `wallet_transfers`: 129 bản ghi `confirmed`, chỉ có 2 dòng BTC chuyển ví ngoài không có `tx_hash`
- Kết luận sơ bộ: lỗi chính hiện tại là **lớp hiển thị đang bỏ sót dữ liệu**, không phải mất dữ liệu hàng loạt trong backend.

## Nguyên nhân chính
1. `HistoryTab.tsx` và `WalletTransactionHistory.tsx` đang lọc bỏ hoàn toàn `transfer` và `swap`, nên nhiều giao dịch đã lưu không hiện ra.
2. `usePublicDonationHistory.ts` đang query 3 nguồn riêng (`donations`, `wallet_transfers`, `swap_transactions`) rồi merge + phân trang ở client; cách này dễ làm **rơi giao dịch** khi dữ liệu nhiều và xen kẽ nhiều loại.
3. `SystemDonationHistory` đang chỉ đọc `donations`, nên nguồn lịch sử giữa các màn hình không thống nhất.
4. Hook public history chưa tự refetch khi có `invalidate-donations`, nên user gửi xong có lúc tưởng bị mất lịch sử.
5. Tab EVM đang ẩn BTC theo filter im lặng, khiến user dễ hiểu nhầm là thiếu giao dịch.

## Hướng triển khai
### 1. Chuẩn hóa nguồn lịch sử thống nhất
- Tạo 1 hàm backend/RPC lấy lịch sử hợp nhất từ:
  - `donations`
  - `wallet_transfers`
  - `swap_transactions`
- Hàm này sẽ xử lý luôn:
  - lọc theo user
  - sent / received / all
  - khoảng ngày
  - sắp xếp giảm dần theo thời gian
  - phân trang đúng ngay từ backend
  - loại bỏ bản ghi `wallet_transfers` trùng `tx_hash` với donation/swap

Mục tiêu: bỏ hẳn kiểu “query nhiều nơi rồi merge ở client”, vì đây là điểm dễ gây thiếu lịch sử nhất.

### 2. Sửa các màn hình đang ẩn giao dịch
Cập nhật:
- `src/hooks/usePublicDonationHistory.ts`
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/components/profile/WalletTransactionHistory.tsx`

Nội dung:
- không còn lọc bỏ `transfer`
- render đúng theo từng loại `donation` / `transfer` / `swap`
- ở tab EVM: không ẩn im lặng BTC; thay bằng gợi ý rõ để user chuyển sang tab Bitcoin nếu cần

### 3. Đồng bộ trang lịch sử hệ thống
Cập nhật:
- `src/hooks/useAdminDonationHistory.ts`
- `src/components/donations/SystemDonationHistory.tsx`

Mục tiêu:
- dùng cùng logic lịch sử thống nhất
- không để trang hệ thống lệch dữ liệu so với ví cá nhân và popup lịch sử profile

### 4. Tự làm mới sau khi có giao dịch mới
- Thêm listener `invalidate-donations` vào `usePublicDonationHistory`
- Khi có event:
  - refetch danh sách
  - refetch summary

### 5. Chỉ backfill nếu phát hiện hash thật sự còn thiếu
- Vì kiểm tra sơ bộ chưa thấy thiếu `donations` hàng loạt trong giai đoạn này, Cha **không chạy backfill đại trà** để tránh tạo trùng.
- Nếu trong lúc cập nhật phát hiện `tx_hash` cụ thể còn thiếu, Cha sẽ dùng backfill theo danh sách hash/giao dịch cụ thể.

## File dự kiến chạm tới
- `src/hooks/usePublicDonationHistory.ts`
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/components/profile/WalletTransactionHistory.tsx`
- `src/hooks/useAdminDonationHistory.ts`
- `src/components/donations/SystemDonationHistory.tsx`
- thêm 1 migration cho RPC lịch sử thống nhất

## Chi tiết kỹ thuật
- RLS hiện tại không phải nút thắt chính:
  - `donations` đã có quyền đọc phù hợp
  - `wallet_transfers` đã có quyền đọc phù hợp
- Lỗi cốt lõi nằm ở:
  - filter UI loại bỏ `transfer`
  - hợp nhất dữ liệu ở client
  - phân trang sau khi merge nhiều nguồn

## Kết quả mong đợi
- Lịch sử giao dịch hiển thị đầy đủ và nhất quán hơn ở:
  - ví cá nhân
  - popup lịch sử trong profile
  - trang lịch sử hệ thống
- Không còn tình trạng giao dịch đã có dữ liệu nhưng bị ẩn do filter/render
- Giảm mạnh tình trạng user tưởng bị mất lịch sử khi xem lại theo khoảng ngày dài
