
Mục tiêu: sửa đúng chỗ đang gây cảm giác “vẫn chưa thấy lệnh”, vì dữ liệu thực ra đã có trong `donations` nhưng một số màn hình vẫn lấy sai user hoặc thiếu nguồn `wallet_transfers`.

1. Kết luận sau khi kiểm tra
- Ví `funtreasury` hiện đã có 2 bản ghi `donations` đúng giao dịch ví ngoài:
  - `0x411c...001d` — CAMLY
  - `0xc4c4...5705` — BTCB
- Nhưng `wallet_transfers` của `funtreasury` vẫn đang là `0`.
- `WalletTransactionHistory` (modal ở trang profile) đang truyền đúng `profile.id`, nên có thể hiển thị các lệnh đó.
- `HistoryTab` trong ví đang bị lệch logic: nó dùng `useCurrentUser()` bên trong thay vì nhận `profile/user id` từ ngoài. Vì vậy khi mở trang `/funtreasury`, tab lịch sử có thể đang tải lịch sử của user đăng nhập, không phải của `funtreasury`.

2. Vấn đề chính cần sửa
- Sai nguồn user ở `src/components/wallet/tabs/HistoryTab.tsx`.
- Thiếu đồng bộ dữ liệu cũ từ `donations` sang `wallet_transfers`, nên những chỗ ưu tiên transfer sẽ vẫn thiếu.
- Cần thống nhất toàn bộ màn hình lịch sử dùng cùng một “target user”.

3. Cách sửa
- Sửa `HistoryTab` để nhận `userId` qua props, không tự lấy từ `useCurrentUser()`.
- Sửa `WalletCenterContainer.tsx` để truyền đúng `profile.id` xuống `HistoryTab`.
- Giữ `WalletTransactionHistory.tsx` theo cùng chuẩn “target user id”.
- Bổ sung backfill cho `funtreasury`: với các giao dịch external đã có trong `donations` nhưng chưa có `wallet_transfers`, tạo thêm bản ghi `wallet_transfers` tương ứng (`direction='in'`, `status='confirmed'`, `counterparty_address=sender_address`).
- Rà lại scanner để các giao dịch mới luôn ghi đồng thời cả `donations` và `wallet_transfers`, tránh lặp lại lỗi cho các lệnh sau.

4. File sẽ chỉnh
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/components/wallet/WalletCenterContainer.tsx`
- nếu cần đồng bộ thêm UI: `src/components/profile/WalletTransactionHistory.tsx`
- backend/backfill liên quan `wallet_transfers` để bù dữ liệu cũ

5. Kết quả mong đợi
- Vào `/funtreasury` sẽ thấy đúng lịch sử của `funtreasury`, không bị lấy nhầm lịch sử của tài khoản đang đăng nhập.
- Hai lệnh ví ngoài đã có sẽ hiện ổn định ở các màn hình lịch sử liên quan.
- Các giao dịch ví ngoài mới về sau sẽ xuất hiện nhất quán ở cả lịch sử, feed và thông báo.
