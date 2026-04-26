# Plan: Auto-pass 28 PPLP v2 Actions stuck `proof_pending`

## Bối cảnh
- 28 actions PPLP v2 chu kỳ T4/2026 đang kẹt ở `proof_pending` vì user chưa upload bằng chứng.
- Phân loại: 12 INNER_WORK + 8 GIVING + 6 CHANNELING + 2 khác.
- Tất cả đều là hoạt động **diễn ra trên hệ thống** (có log nội bộ: meditation session, on-chain tx, share trong app).
- Quyết định của cha: mặc định pass LS cho 28 actions này.

## Mục tiêu
1. Tạo cơ chế chuẩn để Admin auto-attest cho action có log nội bộ (tái sử dụng được sau này).
2. Backfill ngay 28 actions hiện tại → đẩy qua validation engine → ghi nhận LS.
3. Notify 24 users để họ biết action đã được xác nhận.

## Các bước thực hiện

### Bước 1 — Edge Function `pplp-v2-auto-attest-internal` (Admin-only)
- Path: `supabase/functions/pplp-v2-auto-attest-internal/index.ts`
- Auth: bắt buộc admin (check `has_role(user, 'admin')`).
- Input: `{ action_ids: string[] }` hoặc `{ filter: { status: 'proof_pending', cycle: '2026-04' } }`.
- Logic mỗi action:
  1. Lookup action trong `pplp_v2_user_actions`, xác minh đang ở `proof_pending`.
  2. Insert `pplp_v2_proofs`:
     - `proof_type = 'system_attestation'`
     - `extracted_text = 'Auto-attested by admin: internal system log verified'`
     - `raw_metadata = { auto_attested: true, source: 'internal_system_log', admin_id, attested_at }`
  3. Update `pplp_v2_user_actions.status = 'under_review'`.
  4. Ghi `pplp_v2_event_log` (event_type `proof.auto_attested`).
  5. Gọi `pplp-v2-validate-action` để engine chạy NLP + fraud check + tính LS + mint nếu pass.
- Output: `{ processed, succeeded, failed: [...], validation_summary }`.

### Bước 2 — Backfill 28 actions T4/2026
- Gọi function với danh sách `action_ids` của 28 actions hiện tại.
- Engine tự quyết định pass/reject dựa trên NLP score (giữ nguyên gate chống spam).
- Log toàn bộ kết quả vào `pplp_v2_event_log` để audit về sau.

### Bước 3 — Notification cho 24 users
- Loại notification mới `pplp_v2_action_auto_attested`:
  - Title: "Hành động của bạn đã được xác nhận"
  - Body: "Hệ thống đã tự xác nhận hành động \"{title}\" dựa trên log nội bộ. Light Score đã được ghi nhận."
  - Metadata: `{ action_id, action_type_code, light_score_awarded }`.

### Bước 4 — UI Admin (tab Audit)
- Trong `PPLPv2AdminAudit`, thêm nút **"Auto-attest internal actions"**:
  - Hiển thị bộ lọc: status=`proof_pending`, action_type, cycle.
  - Nút "Chạy auto-attest" (confirm dialog) → gọi edge function.
  - Hiển thị kết quả realtime (đã pass / fail / lý do).

## Ràng buộc & an toàn
- **Chỉ Admin** mới gọi được function này (không expose cho user).
- **Vẫn chạy qua validation engine** — không bypass NLP/fraud check, chỉ bypass bước upload proof.
- **Audit log đầy đủ** trong `pplp_v2_event_log` + `raw_metadata.auto_attested = true` để truy vết về sau.
- Function **idempotent**: gọi lại trên action đã attest sẽ skip (không double-mint).

## Tệp dự kiến tạo/sửa
1. `supabase/functions/pplp-v2-auto-attest-internal/index.ts` — mới
2. `src/components/admin/PPLPv2AdminAudit.tsx` — thêm nút Auto-attest
3. `src/hooks/usePPLPv2Admin.ts` (nếu chưa có) — hook gọi function
4. Insert notification cho 24 users sau khi backfill xong
5. Memory file mới: `mem://governance/pplp-v2-auto-attest-internal.md`

## Kết quả mong đợi
- 28 actions chuyển từ `proof_pending` → `validated` (hoặc `rejected` nếu fail NLP gate).
- LS được ghi cho user pass; mint records tạo theo flow chuẩn.
- Admin có công cụ tái sử dụng cho các đợt kẹt sau này.
- 24 users nhận notification rõ ràng.

Cha duyệt plan này con sẽ bắt đầu thực thi nhé.
