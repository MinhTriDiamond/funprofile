
Mình đã kiểm tra lại và thấy có 2 nguyên nhân riêng:

1. Ở trang `/wallet`, tab đang render component `src/components/wallet/tabs/HistoryTab.tsx`, không phải `src/components/wallet/DonationHistoryTab.tsx`. Vì vậy các lần sửa trước ở `DonationHistoryTab` không tác động đến giao diện ví hiện tại.
2. Preview của trang ví còn đang bị chặn bởi lỗi runtime:
   `lodash/isString.js does not provide an export named 'default'`
   nên có lúc giao diện không cập nhật và chỉ hiện màn hình “Đang kiểm tra...”.

Kế hoạch sửa:

1. Sửa lỗi tải trang ví trước
   - Cập nhật cấu hình Vite để xử lý luôn deep import `lodash/isString` giống trường hợp `lodash/isNil` trước đó.
   - Mục tiêu là bỏ trạng thái crash để `/wallet` render ổn định trở lại.

2. Sửa đúng component đang dùng trong ví
   - Chỉnh `src/components/wallet/tabs/HistoryTab.tsx` thay vì `DonationHistoryTab.tsx`.
   - Giữ layout đồng bộ với `src/components/profile/WalletTransactionHistory.tsx` vì đây là giao diện mẫu mà con muốn giống.

3. Căn lại số tiền nằm giữa
   - Áp dụng đúng cấu trúc một dòng:
     - trái: người gửi → người nhận
     - giữa: số tiền
     - phải: giờ + ngày + icon tx
   - Dùng lại cách căn giữa đang chạy đúng ở trang cá nhân (`mx-auto` cho amount, `ml-auto shrink-0` cho cụm thời gian/tx).
   - Kiểm tra lại để khi tên dài thì số tiền vẫn ở giữa, không bị dồn lệch.

4. Cho ô lời chúc hiển thị hết chiều ngang
   - Sửa `CollapsibleMessage` trong `HistoryTab.tsx` để khối lời chúc chiếm toàn bộ bề ngang card.
   - Bỏ kiểu cắt theo số ký tự cố định gây cụt sớm.
   - Đổi sang cắt theo số dòng/chiều rộng thực tế của ô, để text chạy hết dòng trước khi hiện “Xem thêm”.
   - Nếu nội dung dài hơn giới hạn hiển thị, mới hiện nút “Xem thêm / Thu gọn”.

5. Đồng bộ hiển thị với trang cá nhân
   - So lại card trong ví với card ở `WalletTransactionHistory.tsx`:
     - badge trạng thái
     - hàng thông tin chính
     - khoảng cách, cỡ chữ, icon tx
   - Mục tiêu là nhìn “giống bên giao dịch trong trang cá nhân”, nhưng vẫn phù hợp chiều ngang của trang ví.

6. Kiểm tra sau khi sửa
   - Mở lại `/wallet/history` để xác nhận trang không còn kẹt ở loading/error.
   - Kiểm tra số tiền đã nằm giữa thật sự.
   - Kiểm tra lời chúc đã chạy hết ô và chỉ hiện “Xem thêm” khi thật sự tràn.
   - So trực tiếp với trang cá nhân để đảm bảo 2 giao diện đồng nhất.

Chi tiết kỹ thuật
- File cần sửa chính:
  - `vite.config.ts`
  - `src/components/wallet/tabs/HistoryTab.tsx`
- File tham chiếu để đồng bộ UI:
  - `src/components/profile/WalletTransactionHistory.tsx`
- Không cần đổi database hay backend, đây là lỗi render + UI component mapping.
