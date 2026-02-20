
## Sửa triệt để: Ngăn Mint trùng lặp và Hiển thị Lịch sử Chi tiết

### Chẩn đoán cuối cùng

Từ database query, các actions của `leminhtri_test2` vẫn có `mint_status = 'approved'` và `mint_request_id = NULL` dù đã có 2 mint requests (195 FUN, 240 FUN đều ở trạng thái `signed`). Điều này chứng minh lệnh UPDATE trong edge function **thực sự không chạy được**.

Lý do thực: Edge function tạo `supabase` client với `SUPABASE_SERVICE_ROLE_KEY` nhưng khi gọi `.update()` trên `light_actions`, Supabase PostgREST vẫn áp dụng RLS. Service role key chỉ bypass RLS khi client được khởi tạo với option `auth: { persistSession: false }` và **không truyền JWT user token** vào header. Nhưng trong code hiện tại, `createClient` dùng service role key đúng, vấn đề có thể do **policy `roles: {public}` không match `auth.role() = 'service_role'`** khi gọi từ edge function với service key.

**Giải pháp đúng**: Bỏ `auth.role()` check, dùng `USING (true)` cho service_role hoặc tốt hơn là dùng `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` cho service_role calls. Cách đơn giản nhất và chắc chắn nhất là **thêm thêm bước kiểm tra ở phía frontend và sửa RLS policy đúng chuẩn**.

---

### Các thay đổi cần thực hiện

**Sửa 1: Sửa RLS policy (Migration)**

Policy cũ `auth.role() = 'service_role'` có `roles: {public}` — đây là sai. Phải DROP và tạo lại với syntax đúng:

```sql
-- Xóa policy cũ sai
DROP POLICY IF EXISTS "Service role can update light_actions" ON public.light_actions;

-- Tạo policy đúng với TO service_role (không phải TO public)
CREATE POLICY "Service role can update light_actions"
  ON public.light_actions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Sửa 2: Frontend — Disable nút Mint khi đang có pending request**

Trong `LightScoreDashboard.tsx`, thêm điều kiện kiểm tra: nếu `pendingMintRequests.length > 0`, disable nút Mint và ẩn section "FUN chờ mint" (actions đó không còn có thể mint tiếp). Điều này đảm bảo UX ngay cả khi DB update có độ trễ.

```tsx
// Disable Mint button khi có pending request
<Button
  disabled={isClaiming || pendingMintRequests.length > 0 || ...}
>
```

Khi `pendingMintRequests.length > 0`, thay nội dung bằng message "Đang có [X] yêu cầu chờ xử lý — không thể mint thêm cho đến khi hoàn tất".

**Sửa 3: Mở rộng section "Đang chờ xử lý" — hiển thị tất cả trạng thái**

Hiện tại chỉ query `status = 'pending_sig'`. Cần hiển thị tất cả mint requests theo thứ tự thời gian với các trạng thái:

- `pending_sig` → "Chờ Admin ký" (spinner)
- `signed` → "Đã ký, chờ Submit" (check màu xanh nhạt)
- `submitted` → "Đã gửi lên blockchain"
- `confirmed` → "Đã xác nhận on-chain" (check xanh đậm)
- `failed` → "Thất bại" (đỏ)

Mỗi request hiển thị: số FUN, thời gian tạo, trạng thái hiện tại, và thời gian cập nhật.

**Sửa 4: Tạo hook `useMintHistory` riêng biệt**

Tách logic fetch mint history ra hook riêng để có thể dùng lại và dễ maintain:

```typescript
// src/hooks/useMintHistory.ts
// Fetch toàn bộ pplp_mint_requests của user
// Query: SELECT id, amount_display, status, created_at, action_ids, action_types, updated_at
// WHERE user_id = current_user
// ORDER BY created_at DESC
```

**Sửa 5: Cập nhật `fetchPendingMintRequests` trong Dashboard**

Query tất cả status (không chỉ `pending_sig`) để hiển thị lịch sử đầy đủ, nhưng phân loại hiển thị:
- Section "Đang xử lý": `pending_sig`, `signed`, `submitted`
- Section "Lịch sử" (collapsible): `confirmed`, `failed`

---

### Kết quả sau khi fix

```text
Luồng mới:
User có 50 FUN (2 actions)
  ↓
Bấm Mint → Edge function tạo mint_request + UPDATE light_actions (RLS fixed)
  ↓
usePendingActions.refetch() → 0 actions (mint_status = 'pending_sig')
  ↓
Nút Mint bị DISABLE + hiện "Đang có 1 yêu cầu chờ xử lý"
  ↓
Section "Đang chờ Admin ký": 50 FUN | Chờ ký | 2 phút trước
  ↓
Admin ký → status = 'signed'
  ↓
Admin submit → status = 'submitted' → 'confirmed'
  ↓
Section chuyển thành: 50 FUN | Đã xác nhận | On-chain ✓
  ↓
Nút Mint ACTIVE lại (nếu user có actions mới)
```

---

### Tổng hợp file thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/` | DROP + CREATE lại RLS policy đúng `TO service_role` |
| `src/hooks/useMintHistory.ts` | Tạo hook mới fetch toàn bộ mint history |
| `src/components/wallet/LightScoreDashboard.tsx` | Dùng `useMintHistory`, disable Mint khi pending, hiển thị lịch sử đầy đủ |
