

# Backfill "Đã rút" cho toàn bộ user từ bảng donations

## Phân tích hiện trạng

- **`reward_claims`**: Chỉ có 2 bản ghi (angelaivan: 200.000 + 300.000 = 500.000 CAMLY)
- **`donations` từ Treasury**: 241 bản ghi, 126 user, tổng **91.320.999 CAMLY** đã được gửi từ Treasury (`9e702a6f...`) đến các user
- **Kết quả**: Tất cả user (kể cả angelthutrang với 500.000 CAMLY) đều hiển thị "Đã rút = 0" vì `reward_claims` trống

Nguồn dữ liệu chính xác nhất là bảng `donations` vì đã được backfill từ on-chain (Moralis API) trước đó.

## Kế hoạch thực hiện

### 1. Xóa dữ liệu cũ trong `reward_claims`
Xóa 2 bản ghi hiện tại của angelaivan để tránh trùng lặp khi backfill.

### 2. Backfill `reward_claims` từ `donations`
Chèn từng giao dịch từ Treasury vào `reward_claims`, ánh xạ:
- `user_id` = `recipient_id` từ donations
- `amount` = `amount` từ donations  
- `wallet_address` = lấy từ donations metadata hoặc profiles
- `created_at` = `confirmed_at` hoặc `created_at` từ donations

```sql
INSERT INTO reward_claims (user_id, amount, wallet_address, created_at)
SELECT 
  d.recipient_id,
  d.amount::bigint,
  COALESCE(
    p.wallet_address, 
    p.public_wallet_address, 
    p.custodial_wallet_address, 
    'unknown'
  ),
  COALESCE(d.confirmed_at, d.created_at)
FROM donations d
LEFT JOIN profiles p ON p.id = d.recipient_id
WHERE d.sender_id = '9e702a6f-4035-4f30-9c04-f2e21419b37a'
  AND d.status = 'confirmed'
  AND d.recipient_id IS NOT NULL;
```

### 3. Không thay đổi code
Hàm `get_user_honor_stats` đã đọc từ `reward_claims` → chỉ cần dữ liệu có mặt là hiển thị đúng cho tất cả user, kể cả user bị ban.

### Kết quả mong đợi
- **126 user** sẽ có "Đã rút" hiển thị chính xác
- Tổng "Đã rút" toàn hệ thống = **91.320.999 CAMLY**
- User bị ban vẫn giữ nguyên dữ liệu để kiểm toán
- angelthutrang: Đã rút = 500.000
- angelaivan: Đã rút = 500.000 (từ donations, không phải từ 2 bản ghi cũ)

