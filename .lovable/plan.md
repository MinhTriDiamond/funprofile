

## Chặn user tạo trùng lệnh mint FUN

### Nguyên nhân gốc
Edge function `pplp-mint-fun` **không kiểm tra** xem user đã có mint request đang xử lý hay chưa. Nếu allocation không được update sang `claimed` đúng lúc (race condition), user có thể nhấn Claim lần 2 → tạo lệnh trùng.

### Thay đổi

**1. Sửa `supabase/functions/pplp-mint-fun/index.ts`**
- Thêm kiểm tra trước khi insert: query `pplp_mint_requests` với `user_id` + `status IN ('pending_sig', 'signing', 'signed', 'submitted')`
- Nếu đã có → trả 409 Conflict kèm `existing_request_id`

**2. Sửa `src/hooks/useEpochAllocation.ts`**
- Sau khi tìm allocation `pending`, thêm query kiểm tra `pplp_mint_requests` xem allocation đó đã có `mint_request_id` chưa
- Nếu có → không hiện nút Claim, hiện trạng thái "Đang chờ ký duyệt" thay thế

**3. Database migration — Partial unique index**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_mint_per_user 
ON pplp_mint_requests (user_id) 
WHERE status IN ('pending_sig', 'signing', 'signed', 'submitted');
```
Chặn ở tầng database — mỗi user chỉ có tối đa 1 lệnh đang active.

**4. Sửa UI hiển thị trạng thái** (component hiển thị Epoch Minting)
- Khi allocation đã `claimed` hoặc có mint request active → hiện badge "Đang chờ ký duyệt" + disable nút Claim

### Tóm tắt

| Tầng | File | Thay đổi |
|------|------|----------|
| Backend | `pplp-mint-fun/index.ts` | Check trùng trước insert |
| Frontend | `useEpochAllocation.ts` | Check mint_request_id, ẩn nút Claim |
| Database | Migration | Partial unique index |
| UI | Component Epoch Minting | Hiện trạng thái thay vì nút Claim |

