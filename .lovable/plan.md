
Mục tiêu:
1. Sửa ngay lỗi “Tổng nhận có 180.000.000 nhưng tab Đã nhận trống”.
2. Cập nhật lịch sử giao dịch đầy đủ cho tất cả user có ví liên kết.
3. Ổn định lại build đang bị vỡ sau các thay đổi trước.

Tình trạng con đã xác nhận
- `get_user_donation_summary` đã tính cả `wallet_transfers`, nên phần tổng kết đang đúng.
- Nhưng `src/hooks/usePublicDonationHistory.ts` chỉ đọc `wallet_transfers` khi filter là `all` hoặc `transfer`.
- Vì vậy tab `Đã nhận` và `Đã tặng` đang bỏ sót:
  - `wallet_transfers.direction = 'in'` khỏi tab `Đã nhận`
  - `wallet_transfers.direction = 'out'` khỏi tab `Đã tặng`
  - swap cũng đang chỉ hiện ở `all/swap`, không được quy về luồng nhận/gửi theo đúng logic tổng kết.
- Build hiện còn lỗi nền:
  - môi trường phụ thuộc chưa được cài/khôi phục ổn (`vite`, `react-query`, `react-router-dom`, `sonner`, `date-fns`)
  - một số file admin đang bị lỗi kiểu dữ liệu/props nên phải xử lý đồng thời để dự án build lại được.

Kế hoạch triển khai

1. Khôi phục build trước
- Kiểm tra và khôi phục dependency state từ `package.json`/lockfile để `vite` và các package đang khai báo được cài đúng.
- Rà các lỗi TypeScript trong nhóm admin:
  - `Avatar`, `AvatarImage`, `AvatarFallback`
  - `AlertDialog*`
  - các chỗ dữ liệu đang bị suy luận thành `unknown`
- Mục tiêu: đưa project về trạng thái build được trước khi sửa tính năng lịch sử.

2. Sửa logic filter của lịch sử giao dịch công khai
Trong `usePublicDonationHistory.ts`:
- Tab `Đã nhận`:
  - lấy `donations` có `recipient_id = userId`
  - cộng thêm `wallet_transfers` có `direction = 'in'`
  - cộng thêm phần “swap nhận” nếu hệ thống đang muốn phản ánh luồng token nhận theo summary
- Tab `Đã tặng`:
  - lấy `donations` có `sender_id = userId`
  - cộng thêm `wallet_transfers` có `direction = 'out'`
  - cộng thêm phần “swap gửi” tương ứng
- Tab `Swap`: chỉ hiện record swap
- Tab `Chuyển`: chỉ hiện wallet transfer
- Tab `Tất cả`: gộp cả 3 nguồn rồi sort theo thời gian như hiện tại

3. Đồng bộ cách hiển thị với cách tính tổng kết
Hiện summary và danh sách đang dùng hai logic khác nhau.
Con sẽ chỉnh để danh sách bám đúng quy ước đã có:
- donation nhận/gửi
- transfer vào/ra
- swap tính như một luồng gửi + nhận về mặt kế toán, nhưng UI vẫn có card swap riêng ở tab Swap/Tất cả
Nếu cần, ở tab `Đã nhận`/`Đã tặng` con sẽ chỉ đưa vào các record thực sự phù hợp với summary để không còn lệch số giữa bảng tổng kết và danh sách.

4. Cải thiện phân trang để không bị “có số nhưng không có dòng”
Hiện mỗi nguồn dữ liệu đang `.range(from, to)` riêng rồi mới merge/sort.
Cách này có thể làm lệch kết quả khi filter gộp nhiều nguồn.
Con sẽ đổi sang một trong hai hướng:
- hoặc fetch đủ dữ liệu theo filter rồi merge/sort/cắt trang sau cùng
- hoặc phân trang thông minh theo nguồn để tránh rơi mất record mới hơn
Mục tiêu: tab `Đã nhận` của treasury chắc chắn thấy lệnh 180.000.000 CAMLY.

5. Backfill cho tất cả user có ví
Con sẽ dùng backend function để quét toàn bộ `profiles` có ít nhất một trong các địa chỉ:
- `public_wallet_address`
- `wallet_address`
- `external_wallet_address`
Sau đó chạy đồng bộ theo batch:
- backfill transfers
- backfill swaps
- bỏ qua tx đã tồn tại bằng dedupe theo `tx_hash`/`direction`
- log kết quả inserted / skipped / failed để có thể theo dõi
Ưu tiên:
- batch nhỏ
- có delay/retry để tránh rate limit
- không quét lại vô hạn các user đã không có dữ liệu mới

6. Gắn luồng đồng bộ để dữ liệu mới không bị thiếu lần sau
Sau khi sửa xong:
- treasury đã có ví public → giữ nguyên
- cân nhắc thêm một luồng admin/manual batch sync để cha có thể chạy lại khi cần
- giữ auto-scan cho các giao dịch mới, còn batch backfill dùng cho dữ liệu lịch sử

Kết quả mong đợi sau khi làm
- Ở hồ sơ `fun profile treasury`, tab `Đã nhận` sẽ hiện lệnh 180.000.000 CAMLY thay vì “Không có giao dịch nào”.
- Tab `Đã tặng` và `Đã nhận` sẽ không còn lệch với bảng tổng kết.
- Tất cả user có ví liên kết sẽ được quét bổ sung lịch sử on-chain còn thiếu.
- Dự án build lại bình thường, không còn lỗi package/type đang chặn triển khai.

Chi tiết kỹ thuật
```text
Nguồn dữ liệu hiện có
- donations           -> tặng/nhận nội bộ hoặc mapped
- wallet_transfers    -> nạp/rút ví trực tiếp
- swap_transactions   -> swap token

Lỗi chính hiện tại
summary = đúng (đã tính wallet_transfers)
list/filter = thiếu (received/sent không tính wallet_transfers)

Quy tắc cần đồng bộ
- received = donations(recipient) + transfers(in) [+ swap inflow nếu áp theo summary]
- sent     = donations(sender)    + transfers(out) [+ swap outflow nếu áp theo summary]
- all      = donations + transfers + swaps
```

Phạm vi file dự kiến ảnh hưởng
- `src/hooks/usePublicDonationHistory.ts`
- các file admin đang gây lỗi build (`FinancialTab`, `DonationHistoryAdminTab`, `MediaMigrationTab`, và các import UI liên quan)
- backend functions phục vụ backfill batch toàn hệ thống

Rủi ro cần xử lý
- rate limit từ nguồn blockchain
- phân trang sai khi merge nhiều nguồn
- build đang vỡ nên phải xử lý nền trước, nếu không sửa logic xong vẫn không deploy được
