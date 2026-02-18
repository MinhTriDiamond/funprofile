
## Redesign DonationReceivedCard — Nền Trắng, Metallic Sang Trọng

### Vấn đề hiện tại
`DonationReceivedCard` vẫn hiển thị thẻ xanh lá (green gradient) ở phần modal thông báo nhận quà, trong khi con muốn giao diện **nền trắng sạch** như hình thứ hai (image-339.png).

### Phân tích thiết kế mục tiêu (image-339.png)
- **Nền tổng thể**: Trắng (`#ffffff`) với bo góc lớn
- **Header**: 
  - Logo FUN Play tròn ở giữa trên cùng
  - Tiêu đề "FUN PLAY - Biên Nhận Tặng" — màu xám đậm, font bold
  - ID giao dịch rút gọn `#fd34ee...` — màu xám nhạt, font mono
  - Badge "Chúc Mừng Năm Mới" — nền đỏ/hồng gradient nhỏ
- **Banner chúc mừng**: Ô nền hồng nhạt, chữ hồng đậm với hoa 🌸
- **Sender → Recipient**: Avatar tròn, tên, username, mũi tên ở giữa — nằm trên nền trắng
- **Số tiền**: Lớn, đậm, màu xanh lá metallic (`#10b981`) với icon token, trên nền trắng
- **Bảng chi tiết**: 4 dòng (Thời gian, Loại, TX Hash, Trạng thái) — nền trắng, border xám nhạt, không background màu
- **Footer**: Ô vàng nhạt với text "Phúc Lộc Thọ — FUN Play 🧧"
- **Nút hành động**: 
  - "Sao chép link" — outline, border xám
  - "Về FUN Play" — gradient xanh lá sang đậm (metallic green)

### Thay đổi kỹ thuật

**File duy nhất cần sửa:** `src/components/donations/DonationReceivedCard.tsx`

Các thay đổi cụ thể:
1. **Xóa gradient hồng** ở header — đổi sang nền trắng thuần, chỉ giữ logo + title + ID + badge
2. **Banner chúc mừng**: Giữ nền hồng nhạt với hoa 🌸 nhưng nền ngoài trắng
3. **Sender → Recipient section**: Bỏ background, để nền trắng với divider line trên dưới
4. **Amount section**: Bỏ background xanh nhạt — để số tiền lớn trên nền trắng, màu chữ xanh lá metallic (`text-emerald-500`, `font-black text-4xl`)
5. **Bảng chi tiết**: Bỏ border màu, dùng `divide-y divide-gray-100` trên nền trắng
6. **Footer**: Giữ ô vàng nhạt (amber) — phù hợp cả hai hình
7. **Buttons**: Đổi nút "Gửi Cảm Ơn" thành "Về FUN Play" style — gradient `from-emerald-400 to-emerald-600` tạo hiệu ứng metallic xanh lá sang trọng; nút "Xem BSCScan" thêm outline; giữ nút "Đóng" (X)

### Kết quả mong đợi
Thẻ thông báo nhận quà sẽ có:
- Nền **trắng sạch** thay vì xanh lá
- Số tiền **xanh lá metallic** nổi bật trên nền trắng
- Bố cục thanh lịch, chuyên nghiệp như biên lai kỹ thuật số
- Giữ nguyên toàn bộ chức năng (âm thanh, confetti, copy link, gửi cảm ơn)
