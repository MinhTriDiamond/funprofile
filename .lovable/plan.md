

# Bổ sung 33 giao dịch unmapped vào reward_claims

## Vấn đề
- Schema `reward_claims.user_id` đã nullable — đúng
- Có **33 giao dịch** (6.918.000 CAMLY) trong `donations` với `recipient_id IS NULL`
- Nhưng `reward_claims` hiện chỉ có **241 bản ghi**, tất cả đều có `user_id` — 33 bản ghi chưa được insert

## Giải pháp

### Chạy lại Edge Function `backfill-reward-claims`
Edge Function đã có logic đúng (xóa toàn bộ rồi insert lại cả mapped + unmapped). Cần gọi lại function này một lần.

Tuy nhiên, để không phụ thuộc vào việc gọi Edge Function thủ công, con sẽ **tạo migration SQL insert trực tiếp** 33 bản ghi từ `donations` vào `reward_claims`:

```sql
INSERT INTO public.reward_claims (user_id, amount, wallet_address, created_at)
SELECT 
  NULL,
  ROUND(d.amount::numeric),
  COALESCE(d.metadata->>'to_address', d.metadata->>'toAddress', 'unknown'),
  COALESCE(d.confirmed_at, d.created_at)
FROM public.donations d
WHERE d.sender_id = '9e702a6f-4035-4f30-9c04-f2e21419b37a'
  AND d.status = 'confirmed'
  AND d.recipient_id IS NULL;
```

### Kết quả
- `reward_claims` sẽ có **274 bản ghi** (241 + 33)
- Tổng: **98.238.999 CAMLY**
- ClaimHistoryModal đã có logic hiển thị đúng cho `user_id = NULL` (icon ví + "Ví ngoài hệ thống")
- Không cần thay đổi code frontend

