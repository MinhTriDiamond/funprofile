

## Sửa lỗi: Thiếu giao dịch tặng từ bên ngoài và sai attribution sender

### Vấn đề phát hiện

1. **Fast-scan chỉ index `public_wallet_address`**: Khi quét sender, hệ thống chỉ tra cứu 1 trường ví. 75 user có `wallet_address` khác và 21 user có `external_wallet_address` khác -- tất cả bị đánh dấu sai thành `is_external = true, sender_id = null`.

2. **Moralis chỉ trả 100 transfers/token**: Giao dịch cũ hơn bị đẩy ra ngoài danh sách, không bao giờ được quét lại. Đặc biệt CAMLY contract có lượng transfer lớn.

3. **Kết quả**: angelaivan gửi tokens cho Love House nhưng không có donation nào được ghi nhận (0 records từ angelaivan → Love House).

### Giải pháp — 2 thay đổi

**1. Cập nhật `fast-scan-donations/index.ts` — Index đa ví**

- Query thêm `wallet_address` và `external_wallet_address` từ profiles
- Thêm tất cả 3 loại ví vào `walletToProfile` map để sender attribution chính xác
- Khi sender có `wallet_address` hoặc `external_wallet_address` khớp, gán đúng `sender_id` thay vì null

```text
Trước:  SELECT id, public_wallet_address, username, display_name
Sau:    SELECT id, public_wallet_address, wallet_address, external_wallet_address, username, display_name

walletToProfile.set(public_wallet)
walletToProfile.set(wallet_address)     // NEW
walletToProfile.set(external_wallet)    // NEW
```

**2. Tạo Edge Function `backfill-love-house/index.ts` — Quét bổ sung cho Love House**

- Quét trực tiếp ví Love House (`0x18e1...`) qua Moralis endpoint `/erc20/transfers` (nhận vào)
- So sánh với donations đã có, chỉ insert các tx_hash chưa tồn tại
- Tra cứu sender trên cả 3 trường ví để gán đúng `sender_id`
- Tạo posts + notifications + chat messages cho các donation mới
- Chạy 1 lần (manual trigger) để bổ sung lịch sử bị thiếu

### Kết quả
- Tất cả giao dịch đến Love House được ghi nhận đầy đủ
- Sender attribution chính xác cho user có nhiều ví
- Fast-scan tương lai không bị lỗi tương tự

