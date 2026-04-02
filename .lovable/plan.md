

# Đổi logo BTC sang logo mới (Hình 4)

## Phân tích

### 1. Số dư BTC = 0
Đã xác minh trên Mempool.space API: địa chỉ `bc1qej50xw7ax2unfp6lpjc0k65nj38fy7ymx0gfc7` có `funded_txo_sum = 30000`, `spent_txo_sum = 30000` → balance = 0 sats. Đây là dữ liệu chính xác từ blockchain — **không phải lỗi code**.

Con cần cập nhật địa chỉ BTC trong hồ sơ: vào MetaMask → Bitcoin → Receive → copy địa chỉ đúng có chứa 0.00024859 BTC → dán vào Chỉnh sửa hồ sơ → Địa chỉ BTC.

### 2. Đổi logo BTC
User muốn đổi từ logo BTC hiện tại (hình tròn cam) sang logo mới (hình kim cương vàng — Hình 4 đã upload).

## Thay đổi

### Bước 1: Copy logo mới vào project
Copy file `user-uploads://image-1775161598.png` (Hình 4 — logo kim cương vàng) vào `src/assets/tokens/btc-logo.png`, thay thế logo cũ.

### Bước 2: Không cần sửa code
Vì tất cả các file đã import `btc-logo.png` từ `@/assets/tokens/btc-logo.png`, chỉ cần thay file ảnh là xong — logo tự cập nhật ở mọi nơi.

## Kết quả
- Logo BTC mới (kim cương vàng) hiển thị ở tất cả các trang: ví, profile, donation, network selector
- Số dư BTC: con cần cập nhật đúng địa chỉ BTC trong hồ sơ

