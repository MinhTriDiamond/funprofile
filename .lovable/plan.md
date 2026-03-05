

# Sửa số liệu "Đã rút" cho angelaivan

## Nguyên nhân
Khi backfill từ bảng `transactions`, hệ thống ghi nhận 4 giao dịch x 99.999 = 399.996 CAMLY. Tuy nhiên số thực tế là 2 lệnh claim: 200.000 + 300.000 = 500.000 CAMLY. Sai lệch 100.004 CAMLY.

## Kế hoạch

### 1. Xóa 4 bản ghi reward_claims sai của angelaivan
```sql
DELETE FROM reward_claims 
WHERE user_id = '5f9de7c5-0c80-49aa-8e1c-92d8058558e4';
```

### 2. Chèn 2 bản ghi đúng
```sql
INSERT INTO reward_claims (user_id, amount, wallet_address, created_at)
VALUES 
  ('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 200000, '0xb4dd...afaa', timestamp_lệnh_1),
  ('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 300000, '0xb4dd...afaa', timestamp_lệnh_2);
```
*(Sẽ dùng wallet address và timestamp chính xác từ on-chain)*

### 3. Cập nhật 4 bản ghi transactions nếu cần
Kiểm tra xem có cần sửa amount trong bảng `transactions` không để đồng bộ với thực tế on-chain.

### Kết quả mong đợi
- "Đã rút" = **500.000** (thay vì 399.996)
- "Có thể rút" giảm tương ứng 100.004
- Số liệu kiểm toán Treasury chính xác

### Không thay đổi code
Chỉ sửa dữ liệu, không cần sửa frontend hay Edge Functions.

