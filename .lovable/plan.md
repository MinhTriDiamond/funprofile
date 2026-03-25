

## Khắc phục: Giao dịch 10M CAMLY từ angelthutrang → angeldieungoc bị bỏ sót

### Nguyên nhân

`fast-scan-donations` chỉ lấy **100 transfers gần nhất** của mỗi token contract (CAMLY, USDT...) trên toàn hệ thống. Hôm nay (25/03) có khối lượng CAMLY transfer rất lớn, khiến giao dịch 10M CAMLY lúc 13:48 của angelthutrang bị đẩy ra ngoài top 100 trước khi scan kịp chạy.

Database xác nhận: angelthutrang có **0 donation** được ghi nhận ngày 25/03, dù đã chuyển on-chain thành công.

### Giải pháp — 2 thay đổi

**1. Tăng phạm vi quét `fast-scan-donations`**

- Thêm **cursor pagination**: quét 3 pages × 100 = 300 transfers/token thay vì chỉ 100
- Đảm bảo trong giờ cao điểm không bỏ sót giao dịch

```text
Trước: fetch(.../transfers?limit=100)  → 100 transfers
Sau:   fetch(.../transfers?limit=100) + cursor × 2 pages → 300 transfers
```

**2. Backfill ngay cho angelthutrang**

- Chạy `backfill-outgoing-donations` cho user `angelthutrang` (user_id: `b7856e97-...`) với BSCScan fallback (do Moralis key không ổn định)
- Quét tất cả outgoing CAMLY/USDT transfers từ ví `0x5c7ce8d8...` đến các ví fun.rich
- Insert các donation bị thiếu + tạo gift_celebration posts

### Kết quả
- Giao dịch 10M CAMLY → angeldieungoc được ghi nhận
- Các giao dịch outgoing khác bị sót cũng được phục hồi
- Fast-scan tương lai bao phủ 300 transfers, giảm nguy cơ bỏ sót

