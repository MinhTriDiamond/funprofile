

# Đánh giá Backend Pseudocode v2 vs Hệ thống hiện tại & Kế hoạch cập nhật

## Tổng quan

File `FUN_Backend_Pseudocode-2.md` là **bản đặc tả chính thức** (source of truth) cho toàn bộ backend PPLP v2. So sánh với code đã triển khai, hệ thống hiện tại đã đúng khoảng **75%** — còn **7 điểm cần sửa/bổ sung**.

---

## So sánh chi tiết: Đã đúng vs Cần sửa

| Mục trong Pseudocode | Trạng thái | Ghi chú |
|---|---|---|
| Constants (99/1, BASE_MINT_RATE=10, MAX=10/day) | ✅ Đúng | |
| submitAction flow | ✅ Đúng | |
| attachProof + duplicate check | ⚠️ Thiếu | Chưa check `isDuplicateProof` khi attach |
| Validation pipeline (AI → Trust → Community → combine) | ✅ Đúng | |
| `combineSignals` 60/20/20 | ✅ Đúng | |
| `computeRawLightScore` = (S×T×L×V×U)/10000 | ✅ Đúng | |
| `applyMultipliers` (impact × trust × consistency) | ✅ Đúng | |
| Safety: T<3 → manual_review, S=0 or L=0 → rejected | ✅ Đúng | |
| `MAX_HIGH_IMPACT_ACTIONS_PER_DAY = 3` | ❌ Thiếu | Chỉ check 10/day, chưa check 3/day cho high-impact |
| `exceedsVelocityLimits` trong validation pipeline | ❌ Thiếu | Pseudocode yêu cầu check velocity **trong validation**, không chỉ khi submit |
| `isDuplicateProof` trong validation pipeline | ❌ Thiếu | Chưa check trong validate-action |
| `decayTrustForSpam` / `increaseTrustForVerifiedConsistency` | ❌ Thiếu | Chưa có cơ chế cập nhật trust level user |
| `addToLifetimeLightScore(userId, score)` | ❌ Thiếu | Chưa tích lũy lifetime Light Score lên profile |
| `validationDigest` đầy đủ (hash of actionId+userId+score+mint+pplp+definition) | ⚠️ Chưa khớp | Hiện chỉ hash action_id+light_score+mint_amount |
| Zoom participation factor weights (0.25/0.20/0.25/0.15/0.10/0.05) | ⚠️ Chưa khớp | Attendance function chưa dùng đúng trọng số |
| **Bug**: `flagsList` dùng trước khi khai báo (line 368 vs 410) | 🐛 Bug | Sẽ crash khi action có attendance data |

---

## Kế hoạch triển khai — 5 việc

### 1. Sửa bug `flagsList` + bổ sung velocity checks trong `pplp-v2-validate-action`
- Di chuyển `const flagsList = [...aiScores.flags]` lên trước block attendance (line ~358)
- Thêm `isDuplicateProof` check: query proofs có cùng `proof_url` hoặc `file_hash` đã dùng trong action khác
- Thêm `exceedsVelocityLimits` check: count high-impact actions (SOCIAL_IMPACT, SERVICE, GIVING) hôm nay, nếu >= 3 → `manual_review`

### 2. Bổ sung `MAX_HIGH_IMPACT_ACTIONS_PER_DAY` trong `pplp-v2-submit-action`
- Thêm constant `MAX_HIGH_IMPACT_ACTIONS_PER_DAY = 3`
- Check count actions loại SOCIAL_IMPACT/SERVICE/GIVING trong ngày, nếu >= 3 → trả 429

### 3. Thêm trust level tracking trên profile + decay/increase logic
- Database migration: thêm cột `trust_level NUMERIC(4,2) DEFAULT 1.0` vào `profiles`
- Trong `pplp-v2-validate-action`:
  - Khi validated thành công → `increaseTrustForVerifiedConsistency`: trust_level += 0.01, max 1.25
  - Khi flagged spam/duplicate → `decayTrustForSpam`: trust_level -= 0.05, min 1.0
- Dùng `trust_level` thay vì tính từ account age

### 4. Thêm `addToLifetimeLightScore` — tích lũy Light Score
- Database migration: thêm cột `total_light_score NUMERIC(20,4) DEFAULT 0` vào `profiles`
- Sau khi validated thành công → `profiles.total_light_score += finalLightScore`
- Cập nhật `pplp-v2-light-profile` để đọc từ cột này

### 5. Cập nhật `validationDigest` và `participationFactor` cho đúng pseudocode
- **validationDigest**: hash đầy đủ `{actionId, userId, finalLightScore, totalMint, pplpScores, PPLP_DEFINITION}`
- **Participation factor** trong `pplp-v2-attendance`: áp dụng đúng trọng số:
  - appCheckIn: +0.25
  - appCheckOut: +0.20  
  - hostConfirmed: +0.25
  - responseSubmitted: +0.15
  - duration >= 80%: +0.10
  - optionalPresenceSignal: +0.05

---

## Thứ tự

| # | Việc | Ảnh hưởng |
|---|---|---|
| 1 | Sửa bug flagsList + duplicate/velocity check trong validate-action | Sửa lỗi crash + bổ sung anti-fake |
| 2 | High-impact limit trong submit-action | Anti-abuse |
| 3 | Trust level tracking (migration + logic) | Đúng pseudocode Section 9 |
| 4 | Lifetime Light Score (migration + logic) | Đúng pseudocode Section 5 |
| 5 | validationDigest + participationFactor weights | Đúng pseudocode Section 7 & 8 |

## Chi tiết kỹ thuật
- Migration thêm 2 cột vào `profiles`: `trust_level`, `total_light_score`
- Sửa 3 edge functions: `pplp-v2-validate-action`, `pplp-v2-submit-action`, `pplp-v2-attendance`
- Cập nhật `pplp-v2-onchain-mint` với validationDigest mới
- Lưu file pseudocode vào `src/config/FUN_Backend_Pseudocode-2.md` làm tài liệu tham chiếu

