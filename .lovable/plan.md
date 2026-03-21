

## Kế hoạch: Xóa giao dịch ảo và sửa lỗi auto-scan

### Vấn đề gốc
Hệ thống `auto-scan-donations` đã tạo 2 bản ghi donation sai vào 21/03/2026:
- **20.000.000 CAMLY** (id: `334c360e...`) - gán nhầm sender = angeldieungoc
- **200 USDT** (id: `2f64a3e9...`) - gán nhầm sender = angeldieungoc

Trên blockchain, ví gửi thực tế là `0xcc3E037F...9530` — không thuộc về angeldieungoc.

### Bước 1: Xóa 2 bản ghi donation sai
Xóa 2 dòng trong bảng `donations` theo ID.

### Bước 2: Xóa các bài post gift_celebration liên quan (nếu có bản trùng)
Bảng `posts` đã có bản ghi chính xác từ 19/02/2026. Kiểm tra xem auto-scan có tạo thêm post trùng không, nếu có thì xóa.

### Bước 3: Kiểm tra và sửa logic auto-scan
Đọc edge function `auto-scan-donations` để tìm lỗi logic gán sender. Vấn đề có thể là:
- Hệ thống scan ví của angelthanhtinh, phát hiện giao dịch nhận CAMLY
- Tra cứu ví gửi `0xcc3E037F...` nhưng không tìm thấy user nào
- Lỗi fallback: gán nhầm sender dựa trên logic sai

Sửa logic để **bỏ qua** hoặc đánh dấu `is_external: true` khi không tìm thấy sender trong hệ thống.

### Bước 4: Kiểm tra thêm các giao dịch ảo khác
Query toàn bộ donations được tạo cùng thời điểm (05:10 ngày 21/03) để phát hiện các trường hợp tương tự.

### Chi tiết kỹ thuật
- **Migration SQL**: DELETE từ `donations` WHERE id IN (2 IDs)
- **Edge Function**: Sửa `auto-scan-donations/index.ts` — thêm kiểm tra sender wallet phải khớp với wallet đã đăng ký trong profiles
- **Dedup check**: Thêm logic kiểm tra tx_hash đã tồn tại trong `posts` trước khi tạo donation mới

