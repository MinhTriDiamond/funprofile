

# Sửa lỗi "Đã rút" hiển thị 0 trên Bảng Danh Dự

## Nguyên nhân gốc

Khi reset hệ thống trước đó, toàn bộ bảng `reward_claims` đã bị xóa sạch. Tuy nhiên, bảng `transactions` vẫn còn nguyên dữ liệu giao dịch claim thực tế từ Treasury (`0x5102...a402`).

Hàm `get_user_honor_stats` tính "Đã rút" bằng `SUM(amount) FROM reward_claims` → trả về 0.

**Dữ liệu thực tế:** User angelaivan đã nhận 4 giao dịch CAMLY từ Treasury, tổng 399.996 CAMLY, nhưng `reward_claims` = trống.

## Kế hoạch sửa

### 1. Backfill `reward_claims` từ `transactions`

Khôi phục lại dữ liệu claim đã mất bằng cách chèn lại từ bảng `transactions` — nơi vẫn còn bản ghi đầy đủ:

```sql
INSERT INTO reward_claims (user_id, amount, wallet_address, created_at)
SELECT 
  user_id, 
  amount::numeric, 
  to_address, 
  created_at
FROM transactions 
WHERE from_address = '0x5102ecc4a458a1af76afa50d23359a712658a402'
  AND token_symbol = 'CAMLY' 
  AND status = 'confirmed'
ON CONFLICT DO NOTHING;
```

Thao tác này sẽ khôi phục 4 bản ghi (399.996 CAMLY) cho user angelaivan. Nếu tương lai có thêm user claim, dữ liệu cũng sẽ được khôi phục chính xác.

### 2. Không cần sửa code

- Hàm `get_user_honor_stats` đã đọc đúng từ `reward_claims` — chỉ cần dữ liệu có mặt là hiển thị đúng
- Component `CoverHonorBoard.tsx` không cần thay đổi

### Kết quả mong đợi
- "Đã rút" = 399.996 (thay vì 0)
- "Có thể rút" = Tổng thu - 399.996 (thay vì = Tổng thu)
- Tất cả user khác nếu có claim trong `transactions` cũng sẽ được khôi phục

