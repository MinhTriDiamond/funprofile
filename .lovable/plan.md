

# Mở rộng bảng ClaimHistoryModal + đảm bảo hiển thị đầy đủ

## Vấn đề
- Bảng hiện tại `max-w-3xl` (~768px) → các cột bị truncate nhiều, không thấy rõ
- Cần xác nhận 33 giao dịch unmapped (user_id = NULL) đã hiển thị đúng
- Một số cột ẩn trên mobile (`hidden sm:table-cell`) khiến mất thông tin

## Thay đổi

### 1. Mở rộng DialogContent
- `max-w-3xl` → `max-w-5xl` (hoặc `max-w-[90vw]`) để bảng rộng hơn, hiển thị đầy đủ các cột
- Tăng `max-w` của các cột truncate (username, email, full_name) để thấy rõ hơn

### 2. Đảm bảo hiển thị đúng dữ liệu
- User có tài khoản: hiển thị avatar, username, email, full_name bình thường
- User chưa có tài khoản (user_id = NULL / is_external = true): hiển thị icon ví + "Ví ngoài hệ thống" / "External Wallet", email = "—", full_name = "—"
- Kiểm tra query `reward_claims` không filter theo `user_id` (hiện tại đúng — không có `.not('user_id', 'is', null)`)

### 3. Bỏ ẩn cột trên mobile
- Bỏ `hidden sm:table-cell` cho các cột Email, Full Name, Date, Time — luôn hiển thị tất cả
- Bảng sẽ scroll ngang trên mobile nhờ `overflow-auto` đã có

