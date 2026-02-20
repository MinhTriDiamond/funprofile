
## Root Cause: CHECK Constraint Chặn UPDATE mint_status

### Vấn đề thực sự

Từ edge function logs:
```
ERROR code: "23514" — new row violates check constraint "light_actions_mint_status_check"
```

CHECK constraint hiện tại chỉ cho phép:
```sql
mint_status IN ('pending', 'approved', 'minted', 'rejected', 'expired')
```

Nhưng edge function `pplp-mint-fun` cố UPDATE `mint_status = 'pending_sig'` — giá trị **không có trong danh sách**. Database từ chối UPDATE, actions vẫn ở trạng thái `approved`, và user có thể mint lại vô số lần.

Toàn bộ chuỗi lỗi:
1. User bấm Mint → edge function tạo `pplp_mint_requests` thành công
2. Edge function UPDATE `light_actions SET mint_status = 'pending_sig'` → **DATABASE ERROR 23514**
3. Edge function chỉ log warning, không trả lỗi → user thấy "thành công"
4. Actions vẫn `mint_status = 'approved'`, `mint_request_id = NULL`
5. `usePendingActions` query lại → thấy đủ actions cũ → hiển thị vẫn có FUN mintable
6. User có thể bấm Mint tiếp → tạo request mới với cùng actions cũ

---

### Các thay đổi cần thực hiện

**Fix 1: Database Migration — Thêm `pending_sig` vào CHECK constraint**

```sql
-- Xóa constraint cũ
ALTER TABLE public.light_actions 
DROP CONSTRAINT light_actions_mint_status_check;

-- Tạo lại với đầy đủ các giá trị bao gồm 'pending_sig'
ALTER TABLE public.light_actions
ADD CONSTRAINT light_actions_mint_status_check 
CHECK (mint_status = ANY (ARRAY[
  'pending'::text, 
  'approved'::text, 
  'pending_sig'::text,   -- THÊM MỚI
  'minted'::text, 
  'rejected'::text, 
  'expired'::text,
  'confirmed'::text       -- THÊM MỚI (dùng trong edge function sau khi confirmed)
]));
```

Sau khi fix này: Edge function có thể UPDATE `mint_status = 'pending_sig'` thành công.

**Fix 2: Cập nhật `usePendingActions` — Lọc thêm `mint_request_id IS NULL`**

Hiện tại query chỉ filter `mint_status = 'approved'`. Sau khi fix constraint, các actions đã được gán vào mint request sẽ có `mint_status = 'pending_sig'`. Tuy nhiên cần thêm safeguard: lọc thêm `mint_request_id IS NULL` để chắc chắn không tính actions đã được gán:

```typescript
const { data, error: fetchError } = await supabase
  .from('light_actions')
  .select('id, action_type, content_preview, mint_amount, light_score, created_at, mint_status')
  .eq('user_id', session.user.id)
  .eq('mint_status', 'approved')
  .eq('is_eligible', true)
  .is('mint_request_id', null)  // THÊM: chỉ lấy actions chưa có mint request
  .order('created_at', { ascending: false });
```

**Fix 3: Edge function `pplp-mint-fun` — Trả lỗi nếu UPDATE thất bại**

Thay vì chỉ log warning khi UPDATE thất bại, phải rollback toàn bộ (xóa mint_request vừa tạo) và trả lỗi rõ ràng:

```typescript
if (updateActionsError) {
  console.error('[PPLP-MINT] CRITICAL: Update actions error - rolling back:', updateActionsError);
  // Xóa mint request vừa tạo để tránh orphan records
  await supabase.from('pplp_mint_requests').delete().eq('id', mintRequest.id);
  return new Response(JSON.stringify({ 
    error: 'Không thể khóa actions. Vui lòng thử lại.' 
  }), { status: 500, ... });
}
```

Tuy nhiên sau khi Fix 1, lỗi này sẽ không còn xảy ra nữa.

**Fix 4: Xử lý dữ liệu cũ bị sai (Data Cleanup)**

Hiện tại có nhiều actions đã được đưa vào mint requests (đã `signed`/`confirmed`) nhưng vẫn ở `mint_status = 'approved'` do lỗi cũ. Cần update retroactively:

```sql
-- Cập nhật các actions đã có trong mint_requests nhưng chưa có mint_request_id
UPDATE public.light_actions la
SET 
  mint_status = 'pending_sig',
  mint_request_id = subq.mint_request_id
FROM (
  SELECT unnest(action_ids) as action_id, id as mint_request_id, status
  FROM pplp_mint_requests
  WHERE status IN ('pending_sig', 'signed', 'submitted')
) subq
WHERE la.id = subq.action_id
AND la.mint_request_id IS NULL;

-- Cập nhật actions từ các request đã confirmed/failed
UPDATE public.light_actions la
SET 
  mint_status = 'minted',
  mint_request_id = subq.mint_request_id
FROM (
  SELECT unnest(action_ids) as action_id, id as mint_request_id
  FROM pplp_mint_requests
  WHERE status = 'confirmed'
) subq
WHERE la.id = subq.action_id
AND la.mint_request_id IS NULL;
```

---

### Tổng hợp file thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/` | 1. Thêm `'pending_sig'` và `'confirmed'` vào CHECK constraint; 2. Data cleanup SQL |
| `src/hooks/usePendingActions.ts` | Thêm `.is('mint_request_id', null)` vào query |
| `supabase/functions/pplp-mint-fun/index.ts` | Rollback mint_request nếu UPDATE actions thất bại |

---

### Luồng sau khi fix

```text
User bấm Mint 435 FUN (8 reactions + 2 posts)
  ↓
Edge function tạo pplp_mint_requests thành công
  ↓
UPDATE light_actions SET mint_status='pending_sig' → THÀNH CÔNG (constraint đã fix)
  ↓
usePendingActions.refetch():
  query mint_status='approved' AND mint_request_id IS NULL → 0 results
  ↓
UI hiển thị: "0 FUN chờ mint" + "Đang có 1 yêu cầu: 435 FUN - Chờ Admin ký"
  ↓
Nếu user có action MỚI sau đó (reaction mới):
  action mới: mint_status='approved', mint_request_id=NULL
  usePendingActions → thấy 15 FUN mới
  User có thể mint 15 FUN → tạo request mới RIÊNG BIỆT
  UI: "Sẵn sàng: 15 FUN" + "Đang xử lý: 435 FUN (request cũ)"
```
