

# Đánh giá OpenAPI v1.2 vs Hệ thống hiện tại & Kế hoạch triển khai

## Tổng quan

File `FUN_Backend_OpenAPI_v1-2.yaml` là **đặc tả API chính thức** cho toàn bộ backend PPLP v2, định nghĩa 8 endpoints với request/response schemas chi tiết. So sánh với edge functions hiện tại, hệ thống đã cover ~80% — còn một số gaps cần bổ sung.

---

## So sánh chi tiết

| OpenAPI Endpoint | Edge Function hiện tại | Trạng thái |
|---|---|---|
| `POST /v1/actions` (submitAction) | `pplp-v2-submit-action` | ⚠️ Thiếu `LEARNING` action type, thiếu `source_platform` enum |
| `GET /v1/actions/{id}` (getAction) | ❌ Chưa có | Chưa có endpoint đọc chi tiết action + proofs |
| `POST /v1/actions/{id}/proofs` (attachProof) | `pplp-v2-attach-proof` | ⚠️ Thiếu `document` proof type |
| `POST /v1/actions/{id}/validate` | `pplp-v2-validate-action` | ⚠️ Thiếu `force_manual_review` option |
| `POST /v1/actions/{id}/mint` | `pplp-v2-onchain-mint` | ⚠️ Thiếu `release_mode` + `claim_percent` params |
| `GET /v1/users/{id}/light-profile` | `pplp-v2-light-profile` | ✅ Đúng |
| `POST /v1/events` (createEvent) | `pplp-v2-event-manage` | ⚠️ Thiếu `COMMUNITY_EVENT` type, thiếu `livestream_links` array |
| `POST /v1/events/{id}/groups` | `pplp-v2-event-manage` | ✅ Đúng (cùng function) |
| `POST /v1/events/{id}/groups/{id}/attendance` | `pplp-v2-attendance` | ⚠️ Thiếu `attendance_mode` enum |

### Gaps chi tiết

1. **Action type `LEARNING`**: OpenAPI thêm loại này, code hiện tại chỉ có 5 loại
2. **Proof type `document`**: OpenAPI thêm loại này
3. **`source_platform` enum**: Chuẩn hóa platforms (zoom, facebook, youtube, telegram, internal, onchain, other)
4. **`GET /v1/actions/{id}`**: Endpoint đọc action detail + proofs — hoàn toàn chưa có
5. **`force_manual_review`**: Option cho admin/moderator buộc review thủ công
6. **`release_mode` + `claim_percent`**: Mint request cho phép partial lock
7. **`attendance_mode` enum**: direct_checkin, system_log, group_leader_confirmed, hybrid
8. **Response schemas chuẩn hóa**: `ErrorResponse` format thống nhất (code, message, details)

---

## Kế hoạch triển khai — 5 bước

### 1. Lưu OpenAPI spec + cập nhật action/proof types
- Lưu file vào `src/config/FUN_Backend_OpenAPI_v1-2.yaml`
- Thêm `LEARNING` vào `VALID_ACTION_CODES` trong `pplp-v2-submit-action`
- Thêm `document` vào `VALID_PROOF_TYPES` trong `pplp-v2-attach-proof`
- Thêm `source_platform` field vào `pplp_v2_user_actions` schema

### 2. Tạo endpoint `pplp-v2-get-action` (GET action detail)
- Query `pplp_v2_user_actions` + join `pplp_v2_action_proofs`
- Trả về đúng `ActionDetailResponse` schema
- RLS: chỉ user owner hoặc admin thấy

### 3. Cập nhật validate-action: `force_manual_review` option
- Nhận param `force_manual_review: boolean`
- Nếu `true` → skip AI scoring, set status = `manual_review` ngay

### 4. Cập nhật onchain-mint: `release_mode` + `claim_percent`
- Nhận `release_mode: "instant" | "partial_lock"` và `claim_percent: 0-100`
- Nếu `partial_lock`: tính `claimable_now` = totalMint × claim_percent/100, phần còn lại → `mintValidatedActionLocked`

### 5. Cập nhật attendance: `attendance_mode` enum
- Thêm `attendance_mode` column vào `pplp_v2_attendance` (migration)
- Hỗ trợ 4 modes: `direct_checkin`, `system_log`, `group_leader_confirmed`, `hybrid`
- `attendance_mode` ảnh hưởng trọng số `participation_factor`

---

## Thứ tự

| # | Việc | Ảnh hưởng |
|---|---|---|
| 1 | Lưu OpenAPI + cập nhật action/proof types | Mở rộng input hợp lệ |
| 2 | Tạo `pplp-v2-get-action` endpoint | Feature mới — đọc action detail |
| 3 | `force_manual_review` trong validate-action | Admin control |
| 4 | `release_mode` + `claim_percent` trong onchain-mint | Partial lock support |
| 5 | `attendance_mode` enum trong attendance | Chuẩn hóa attendance tracking |

## Chi tiết kỹ thuật
- Migration: thêm cột `source_platform` vào `pplp_v2_user_actions`, thêm `attendance_mode` vào `pplp_v2_attendance`
- Tạo 1 edge function mới: `pplp-v2-get-action`
- Sửa 4 edge functions: `pplp-v2-submit-action`, `pplp-v2-attach-proof`, `pplp-v2-validate-action`, `pplp-v2-onchain-mint`, `pplp-v2-attendance`
- Chuẩn hóa error response format `{ code, message, details }` cho tất cả functions

