

# Điều chỉnh giao diện Dialog "Tặng quà" — Hiển thị form gửi tiền ngay

## Vấn đề hiện tại

Khi nhấn nút "Tặng" trên Navbar, dialog mở ra nhưng phần **tìm kiếm người nhận** chiếm hầu hết không gian hiển thị, kèm theo thông báo "Vui lòng chọn người nhận trước" và toàn bộ form (Token, Số lượng, Lời nhắn) bị mờ đi (`opacity-50 pointer-events-none`). Điều này tạo cảm giác như đang ở "màn hình tìm kiếm" thay vì "dialog chuyển tiền."

## Giải pháp

Sắp xếp lại thứ tự hiển thị trong dialog để form gửi tiền hiện ra **ngay lập tức** và **tương tác được**, với phần tìm người nhận chỉ là một trường nhỏ trong form — giống trải nghiệm gửi tiền thông thường.

## Thay đổi cụ thể

### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

1. **Bỏ `opacity-50 pointer-events-none`** trên phần form (dòng 707): Các trường Token, Số lượng, Lời nhắn luôn hiển thị bình thường và tương tác được ngay khi mở dialog.

2. **Bỏ thông báo "Vui lòng chọn người nhận trước"** (dòng 676-682): Không cần nhắc nhở vì form đã hiện sẵn, nút "Xem lại & Xác nhận" vẫn bị vô hiệu hóa cho đến khi chọn xong người nhận.

3. **Sắp xếp lại thứ tự hiển thị** trong Step 1 (flowStep === 'form'):
   - Người gửi (giữ nguyên)
   - **Token** (hiện ngay)
   - **Số lượng** (hiện ngay)
   - **Người nhận** (search inline, nhỏ gọn)
   - **Lời nhắn** (hiện ngay)
   - Nút "Xem lại & Xác nhận"

4. **Giữ nguyên logic disable nút "Xem lại & Xác nhận"**: Nút này chỉ bật khi đã chọn người nhận hợp lệ + số lượng hợp lệ + đủ số dư (logic `canProceedToConfirm` không thay đổi).

### Kết quả mong đợi

- Nhấn "Tặng" trên Navbar hoặc "Send" trong /wallet đều mở dialog với **đầy đủ form tương tác ngay**.
- Người dùng có thể chọn token, nhập số lượng, viết lời nhắn **trước** hoặc **sau** khi tìm người nhận — tùy ý.
- Nút xác nhận chỉ bật khi đủ điều kiện (có người nhận + số lượng hợp lệ).

