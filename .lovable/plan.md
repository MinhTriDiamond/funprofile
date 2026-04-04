

# Đồng bộ giao dịch 12 tỷ CAMLY cho funtreasury

## Tình trạng phát hiện

- User `funtreasury` (ví `0xa496...da5d`) báo nhận 12 tỷ CAMLY từ ví ngoài nhưng chưa hiển thị trong hệ thống
- Database hiện chỉ ghi nhận **~1.435 tỷ CAMLY** cho user này (5 giao dịch)
- Moralis webhook hoặc scanner `scan-my-incoming` chưa quét được giao dịch mới này

## Giải pháp: 2 bước

### Bước 1: Kích hoạt quét lại (scan-my-incoming)

Gọi edge function `scan-my-incoming` với auth token của user `funtreasury` để Moralis API tìm giao dịch CAMLY mới nhất và tự động tạo:
- Record trong bảng `donations`
- Record trong bảng `wallet_transfers`
- Bài viết `gift_celebration`
- Thông báo (notification)

### Bước 2: Nếu scan không tìm thấy — Backfill thủ công

Nếu Moralis API không trả về giao dịch (do rate limit hoặc delay), sẽ:
1. Dùng BSC RPC trực tiếp (`eth_getLogs`) để tìm giao dịch CAMLY transfer đến ví `0xa496...da5d` gần đây
2. Lấy `tx_hash`, `from_address`, `value`, `block_timestamp`
3. Insert trực tiếp vào `donations`, `wallet_transfers`, tạo `gift_celebration` post

### Chi tiết kỹ thuật

- Token CAMLY: `0x0910320181889fefde0bb1ca63962b0a8882e413` (3 decimals)
- 12 tỷ CAMLY = `12000000000` = raw value `12000000000000` (×10³)
- Sẽ sử dụng `scan-my-incoming` edge function hoặc BSC RPC endpoint để xác minh giao dịch on-chain trước khi ghi nhận

## Kết quả mong đợi

- Giao dịch 12 tỷ CAMLY xuất hiện trong lịch sử giao dịch của funtreasury
- Bài viết chúc mừng hiển thị trên bảng tin
- Số dư và tổng tài sản cập nhật chính xác

