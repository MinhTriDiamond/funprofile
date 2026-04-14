

# Đánh giá FUN_ERD_Sequence_Diagrams_v1-2.docx & Kế hoạch triển khai

## File này là gì?

Tài liệu kiến trúc chính thức gồm 6 trang, bao gồm:
- **ERD** (Entity Relationship Diagram): mô hình dữ liệu chuẩn cho toàn bộ backend
- **3 Sequence Diagrams**: luồng core action→mint, luồng attendance Zoom/Love House, và luồng async jobs/manual review
- **Cross-team responsibilities**: phân chia Backend, Frontend, DevOps
- **Build-time invariants**: 6 quy tắc bất biến
- **Monitoring suggestions**: 5 nhóm metrics cho DevOps

---

## So sánh ERD với hệ thống hiện tại

| Entity trong ERD | Bảng hiện tại | Trạng thái |
|---|---|---|
| `users` (wallet_address, trust_level, total_light_score, total_fun_minted) | `profiles` | ⚠️ Thiếu `wallet_address` trên profiles — hiện lưu ở bảng `wallets` riêng |
| `action_types` (code, pillar_group, base_impact_score) | `pplp_v2_action_types` | ✅ Đúng — có `pillar_weights`, `base_impact_score` |
| `user_actions` (user_id, action_type_id, status, source_platform/source_url) | `pplp_v2_user_actions` | ✅ Đúng |
| `proofs` (action_id, user_id, proof_type, proof_url) | `pplp_v2_action_proofs` | ✅ Đúng |
| `pplp_validations` (action_id, 5 pillars, final_light_score, validation_status) | `pplp_v2_validations` | ✅ Đúng |
| `mint_records` (action_id, user_id, mint_amount_total/user/platform) | `pplp_v2_mint_records` | ✅ Đúng |
| `balance_ledger` (user_id, entry_type, amount, reference_table/reference_id) | `pplp_v2_balance_ledger` | ✅ Đúng |
| `events` (event_type, zoom_meeting_id, **livestream_urls**, host_user_id) | `pplp_v2_events` | ⚠️ `livestream_urls` lưu trong `raw_metadata` JSON, không phải cột riêng |
| `event_groups` (event_id, leader_user_id, estimated_participants) | `pplp_v2_event_groups` | ✅ Đúng |
| `group_attendance` (event_id, group_id, user_id, **presence/confidence**) | `pplp_v2_attendance` | ⚠️ Thiếu cột `attendance_confidence` riêng — hiện tính runtime |
| `community_reviews` (action_id, user_id, review, flags) | `pplp_v2_community_reviews` | ✅ Đúng |

### Sequence Diagram gaps

| Sequence | Trạng thái | Gap |
|---|---|---|
| **Seq 1**: Core action→proof→validate→mint | ✅ Đã triển khai | Flow đúng: submit→attach→validate→mint |
| **Seq 2**: Zoom/Love House attendance | ✅ Đã triển khai | Có check-in/out, host confirm, participation_factor |
| **Seq 3**: Async jobs + manual review + observability | ⚠️ Chưa có | Thiếu event bus topics, queue/worker pattern, metrics emission |

### Build-time invariants — kiểm tra

| Invariant | Trạng thái |
|---|---|
| PPLP = "Proof of Pure Love Protocol" | ✅ Đúng |
| No Proof → No Score | ✅ Đúng (validate-action check proof exists) |
| No Score → No Mint | ✅ Đúng (onchain-mint check validation_status = 'validated') |
| Action_id mint at most once (idempotency) | ✅ Đúng (processedActionIds on-chain + DB check) |
| Livestream proves event, not individual participation | ✅ Đúng (attendance cần personal signals) |
| Face detection = supporting only | ✅ Đúng (optional_signals, không phải sole source) |

---

## 4 điểm cần bổ sung

1. **`livestream_urls` cột riêng trên `pplp_v2_events`**: ERD chỉ ra đây là field riêng, không nằm trong metadata. Hiện tại lưu trong `raw_metadata.livestream_links` — cần thêm cột JSONB `livestream_urls`.

2. **`attendance_confidence` cột riêng trên `pplp_v2_attendance`**: ERD chỉ ra `presence / confidence` là field persisted. Hiện tại chỉ tính runtime và trả trong response — cần lưu vào DB.

3. **Async job observability (Sequence 3)**: Chưa có event bus topics (`action.submitted`, `proof.attached`, `validation.completed`, `mint.completed`). Cần ít nhất log/audit trail cho các sự kiện này.

4. **Lưu trữ file tài liệu**: Lưu file DOCX vào `src/config/` làm tài liệu tham chiếu.

---

## Kế hoạch triển khai — 3 bước

### Bước 1: Lưu file + Migration thêm 2 cột
- Lưu file vào `src/config/FUN_ERD_Sequence_Diagrams_v1-2.docx`
- Migration: thêm `livestream_urls JSONB DEFAULT '[]'` vào `pplp_v2_events`
- Migration: thêm `attendance_confidence NUMERIC(4,2)` vào `pplp_v2_attendance`

### Bước 2: Cập nhật edge functions để đọc/ghi cột mới
- `pplp-v2-event-manage`: ghi `livestream_links` vào cột `livestream_urls` thay vì nhúng trong `raw_metadata`
- `pplp-v2-attendance`: ghi `attendance_confidence` vào DB khi check-in/check-out

### Bước 3: Thêm audit trail cho async events
- Tạo bảng `pplp_v2_event_log` (event_type, payload, created_at) — ghi log cho `action.submitted`, `proof.attached`, `validation.completed`, `mint.completed`
- Cập nhật `submit-action`, `attach-proof`, `validate-action`, `onchain-mint` để ghi event log sau mỗi operation thành công

---

## Thứ tự & ảnh hưởng

| # | Việc | Files ảnh hưởng |
|---|---|---|
| 1 | Lưu file + migration (2 cột mới) | 1 migration |
| 2 | Cập nhật event-manage + attendance | 2 edge functions |
| 3 | Audit trail event_log | 1 migration + 4 edge functions |

## Chi tiết kỹ thuật
- Migration thêm 2 cột vào bảng hiện có — backward-compatible, không ảnh hưởng data cũ
- `livestream_urls` dùng JSONB để lưu array `[{platform, url}]`
- `attendance_confidence` lưu giá trị 0.00-1.00
- Event log table là append-only, dùng cho observability — không ảnh hưởng business logic

