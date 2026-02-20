
## Sửa lỗi: Actions vẫn hiện sau khi Mint và Admin có thể duyệt lại

### Chẩn đoán chính xác

Có 2 lỗi nối tiếp nhau tạo ra vòng lặp nguy hiểm:

**Lỗi A — Edge function cập nhật `light_actions` bị thất bại im lặng**

Sau khi tạo mint request, edge function gọi:
```sql
UPDATE light_actions
SET mint_status = 'pending_sig', mint_request_id = <id>
WHERE id IN (...)
```

Nhưng database cho thấy toàn bộ records vẫn có `mint_status = 'approved'` và `mint_request_id = NULL`. Nguyên nhân: **thiếu RLS policy** cho phép `service_role` UPDATE bảng `light_actions`. Edge function dù dùng service role key nhưng `light_actions` chỉ có policy cho authenticated users (`auth.uid() = user_id`), không có policy `(auth.role() = 'service_role')`.

**Lỗi B — Anti-duplicate check sai logic**

```typescript
// Dòng 114 trong edge function — SAI:
.not('mint_status', 'in', '("approved","failed")')
// Câu này loại bỏ approved khỏi kết quả, tức là actions với mint_status='pending_sig'
// KHÔNG được check, nhưng vì Lỗi A không update được, chúng vẫn là 'approved'
// → Check này không bao giờ bắt được duplicate
```

Điều kiện đúng phải là: nếu action đã có `mint_request_id` và `mint_status` là `pending_sig` (hoặc `minted`) thì từ chối.

---

### Giải pháp — 2 thay đổi cần thực hiện

---

**Sửa 1: Thêm RLS policy cho `light_actions` — cho phép service_role UPDATE**

Thêm migration SQL:
```sql
-- Cho phép edge function (service role) cập nhật mint_status và mint_request_id
CREATE POLICY "Service role can update light_actions"
  ON public.light_actions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Đây là fix quan trọng nhất — sau khi có policy này, lệnh UPDATE trong edge function sẽ thực thi thành công.

---

**Sửa 2: Sửa logic anti-duplicate trong `pplp-mint-fun/index.ts`**

```typescript
// TRƯỚC (sai — điều kiện loại trừ nhầm):
const { data: duplicateActions } = await supabase
  .from('light_actions')
  .select('id, mint_request_id, mint_status')
  .in('id', action_ids)
  .not('mint_request_id', 'is', null)
  .not('mint_status', 'in', '("approved","failed")');

// SAU (đúng — chặn actions đã được gửi đi):
const { data: duplicateActions } = await supabase
  .from('light_actions')
  .select('id, mint_request_id, mint_status')
  .in('id', action_ids)
  .not('mint_request_id', 'is', null)
  .in('mint_status', ['pending_sig', 'minted', 'confirmed']);
```

Câu này có nghĩa: từ chối nếu action đã được gán vào một mint request và trạng thái đang ở `pending_sig`, `minted`, hoặc `confirmed`.

---

**Sửa 3 (bổ sung): Hiển thị trạng thái `pending_sig` trong tab FUN Money**

Sau khi bấm Mint, user nên thấy một section "Đang chờ Admin ký" thay vì thấy lại số FUN có thể mint. Hiện tại `usePendingActions` sau khi `refetch` sẽ lấy đúng (actions đã có `pending_sig` không còn trong danh sách `approved`), nhưng cần thêm một query riêng để hiển thị mint requests đang chờ.

Cần thêm vào `LightScoreDashboard.tsx` một section nhỏ hiển thị các `pplp_mint_requests` có `status = 'pending_sig'` của user — giúp user biết yêu cầu đang được xử lý và không bấm lại.

---

### Tổng hợp các file thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/` | Thêm RLS policy `service role UPDATE light_actions` |
| `supabase/functions/pplp-mint-fun/index.ts` | Sửa logic anti-duplicate (dòng 113-114) |
| `src/components/wallet/LightScoreDashboard.tsx` | Thêm section hiển thị mint requests đang chờ |

---

### Luồng sau khi fix

```text
User bấm Mint 195 FUN
  ↓
Edge function tạo mint_request (pending_sig)
  ↓
UPDATE light_actions: mint_status = 'pending_sig' ← [Fix 1: RLS policy]
  ↓
usePendingActions.refetch() → query mint_status='approved' → trả về 0 actions
  ↓
Tab hiển thị: "0 FUN chờ mint" + section "Đang chờ Admin ký: 195 FUN"
  ↓
Admin ký → mint_request.status = 'confirmed' → light_actions.mint_status = 'minted'
  ↓
Tab hiển thị: "Đã mint thành công" + số dư on-chain tăng lên
```
