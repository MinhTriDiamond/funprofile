

# Đánh giá FUN_Backend_OpenAPI_Examples-2.json & Kế hoạch triển khai

## File này là gì?

File JSON chứa **8 cặp request/response mẫu** cho toàn bộ PPLP v2 API — đây là tài liệu tham chiếu chính thức để đảm bảo tất cả edge functions trả về đúng format.

## So sánh với hệ thống hiện tại

| Example | Trạng thái | Gap |
|---|---|---|
| `submit_action_request/response` | ⚠️ Gần đúng | Response hiện tại trả `action_id, status, message` — thiếu `created_at` |
| `attach_event_proof_request` | ✅ Đúng | Có `external_ref`, `metadata` |
| `validate_action_response` | ⚠️ Thiếu fields | Thiếu `ai_score`, `community_score`, `trust_signal_score`, `explanation.notes[]` trong response |
| `mint_action_request/response` | ✅ Đúng | `release_mode`, `claim_percent`, `claimable_now`, `locked_amount` đã triển khai |
| `create_event_request` | ⚠️ Thiếu | Thiếu `livestream_links[]` array trong event-manage |
| `create_group_request` | ✅ Đúng | |
| `submit_attendance_request/response` | ⚠️ Thiếu | Response thiếu `attendance_confidence` field; request thiếu `optional_signals` support |
| `user_light_profile_response` | ⚠️ Format khác | Example dùng `pillar_summary` với key `*_avg` — hiện tại trả key không có `_avg` suffix; thiếu `recent_actions` count (trả array thay vì number) |

### 5 điểm cần sửa

1. **submit-action response**: Thêm `created_at` vào response
2. **validate-action response**: Bổ sung `ai_score`, `community_score`, `trust_signal_score`, `explanation.notes[]`
3. **attendance response**: Thêm `attendance_confidence` field; hỗ trợ `optional_signals` trong request
4. **light-profile response**: Đổi pillar keys thành `*_avg`; `recent_actions` trả number thay vì array
5. **event-manage**: Hỗ trợ `livestream_links[]` array khi tạo event

## Kế hoạch triển khai — 3 bước

### Bước 1: Lưu file examples + sửa response format các edge functions
- Lưu file vào `src/config/FUN_Backend_OpenAPI_Examples-2.json`
- `pplp-v2-submit-action`: thêm `created_at` vào response
- `pplp-v2-validate-action`: bổ sung `ai_score`, `community_score`, `trust_signal_score`, `explanation` vào response JSON

### Bước 2: Sửa attendance + light-profile response format
- `pplp-v2-attendance`: thêm `attendance_confidence` vào response, hỗ trợ `optional_signals` object trong request
- `pplp-v2-light-profile`: đổi pillar keys thành `serving_life_avg`, v.v.; `recent_actions` trả number (count)

### Bước 3: Sửa event-manage — livestream_links support
- `pplp-v2-event-manage`: nhận và lưu `livestream_links[]` array khi tạo event

## Thứ tự & ảnh hưởng

| # | Việc | Files sửa |
|---|---|---|
| 1 | Lưu examples + sửa submit-action & validate-action response | 3 files |
| 2 | Sửa attendance & light-profile response | 2 files |
| 3 | Sửa event-manage (livestream_links) | 1 file |

## Chi tiết kỹ thuật
- Không cần migration — chỉ sửa response format trong edge functions
- Ngoại trừ `livestream_links` có thể cần cột JSONB mới trong `pplp_v2_events` (nếu chưa có)
- Tất cả thay đổi đều backward-compatible — chỉ thêm fields, không xóa

