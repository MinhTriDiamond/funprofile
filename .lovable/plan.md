

# Cập nhật giao dịch BTC hiển thị đúng người gửi (funtreasury)

## Nguyên nhân

Giao dịch `d8e744...0a5d` gửi 0.00938 BTC đến `@angelnguyenhoa` được thực hiện từ địa chỉ `bc1qk7m...cnly` — một địa chỉ phụ trong HD wallet của `funtreasury`. Vì địa chỉ này không trùng với `btc_address` chính đã đăng ký (`bc1q8t7e...4fxq`), scanner đánh dấu là "Ví ngoài".

## Giải pháp

### Migration SQL — Cập nhật 3 bảng

```sql
-- 1. Cập nhật donations: gán sender_id = funtreasury, bỏ is_external
UPDATE donations
SET sender_id = '733a0ca6-91e2-4513-a1a0-ce34fea484f8',
    is_external = false
WHERE id = '103c49bd-bb79-419a-815f-546b177239ab';

-- 2. Cập nhật wallet_transfers (nếu có record cho giao dịch này)
UPDATE wallet_transfers
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{sender_username}', '"funtreasury"'
)
WHERE tx_hash = 'd8e744a751e86cc7ec4573de627c05f4d3250a3142f557ecd43d8f79c0300a5d';

-- 3. Cập nhật bài viết chúc mừng (nếu có)
UPDATE posts
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'),
    '{sender_username}', '"funtreasury"'
  ),
  '{sender_display_name}', '"FUN TREASURY"'
)
WHERE type = 'gift_celebration'
  AND metadata->>'tx_hash' = 'd8e744a751e86cc7ec4573de627c05f4d3250a3142f557ecd43d8f79c0300a5d';
```

## Kết quả

- Giao dịch sẽ hiển thị **"funtreasury"** thay vì "Ví ngoài"
- Avatar và tên hiển thị của FUN TREASURY sẽ xuất hiện đúng trong lịch sử giao dịch

