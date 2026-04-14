

# Đánh giá FUN_Jira_Task_Breakdown_v1-2.docx & Trạng thái hiện tại

## File này là gì?

Bản phân rã công việc chính thức theo 8 EPICs cho toàn bộ hệ sinh thái FUN, chia theo Backend / Frontend / DevOps. Đây là **project management blueprint** — không chứa code hay spec mới, mà là bản đồ kiểm soát tiến độ.

---

## So sánh từng EPIC với hệ thống đã triển khai

| EPIC | Tasks | Đã xong | Còn thiếu |
|---|---|---|---|
| **1: Core Action & Proof** | 5 | 5/5 ✅ | — |
| **2: Validation Engine (PPLP)** | 5 | 5/5 ✅ | — |
| **3: Light Score Engine** | 4 | 4/4 ✅ | — |
| **4: Mint Engine** | 5 | 5/5 ✅ | — |
| **5: Event/Group/Attendance** | 5 | 5/5 ✅ | — |
| **6: Frontend User Flow** | 5 | 5/5 ✅ | — |
| **7: DevOps & Infrastructure** | 5 | 3/5 ⚠️ | Redis queue, CI/CD pipeline |
| **8: Anti-Fraud & Security** | 5 | 3/5 ⚠️ | Similarity detection, Manual audit tools |

### Chi tiết từng EPIC

**EPIC 1 — Core Action & Proof ✅ DONE**
- `pplp-v2-submit-action`: 6 action types, validation, velocity limits
- `pplp-v2-attach-proof`: 7 proof types, duplicate detection (hash + URL)
- Tables: `pplp_v2_user_actions`, `pplp_v2_action_types`, `pplp_v2_proofs`

**EPIC 2 — Validation Engine ✅ DONE**
- `pplp-v2-validate-action`: AI scoring 5 pillars, community review weight, trust signal score
- `pplp-v2-community-review`: community review system
- `force_manual_review` flag cho manual review

**EPIC 3 — Light Score Engine ✅ DONE**
- Multiplicative formula: `(S × T × L × V × U) / 10^4`
- Impact weight, trust multiplier, consistency multiplier
- Zero pillar = zero score (handled)
- `total_light_score` persisted trên `profiles`

**EPIC 4 — Mint Engine ✅ DONE**
- `pplp-v2-onchain-mint`: 99/1 split, idempotent mint, release_mode (instant/partial_lock)
- `pplp_v2_mint_records` + `pplp_v2_balance_ledger`
- Smart contract integration (FUNMoneyMinter-2.sol ABI saved)

**EPIC 5 — Event/Group/Attendance ✅ DONE**
- `pplp-v2-event-manage`: create event + groups, livestream_urls
- `pplp-v2-attendance`: check-in/out, participation_factor, attendance_confidence

**EPIC 6 — Frontend ✅ DONE**
- `PPLPv2SubmitWizard`: action submission + proof upload wizard
- `PPLPv2ExtendedUI`: events, attendance, Light Profile dashboard
- `LightScoreDashboard`: 5-pillar visualization
- `ValidationResultCard`: validation explanation UI

**EPIC 7 — DevOps ⚠️ 3/5**
- ✅ PostgreSQL database (Lovable Cloud)
- ✅ Event-driven architecture (`pplp_v2_event_log` audit trail)
- ✅ Logging & monitoring (event_log table)
- ❌ **Redis queue cho async jobs** — không khả thi trên Lovable Cloud (không có Redis). Hiện tại dùng synchronous edge function calls thay thế.
- ❌ **CI/CD pipeline** — nằm ngoài phạm vi Lovable (Lovable tự động deploy edge functions)

**EPIC 8 — Anti-Fraud ⚠️ 3/5**
- ✅ Duplicate proof detection (hash + URL check)
- ✅ Velocity limits (10/day total, 3/day high-impact)
- ✅ Trust decay system (trust_level -= 0.05 khi spam)
- ❌ **Similarity detection (content spam)** — chưa có logic so sánh nội dung giữa các actions
- ❌ **Manual audit tools** — chưa có admin UI để review/flag actions thủ công

---

## Đánh giá tổng thể

Hệ thống đã hoàn thành **36/39 tasks** (~92%). Theo tinh thần "Do not scale before you validate truth", 4 tuần đầu (EPIC 1-5) đã triển khai xong hoàn toàn đúng thứ tự ưu tiên.

### 3 tasks còn thiếu — có cần triển khai không?

| Task | Đánh giá | Khuyến nghị |
|---|---|---|
| Redis queue (async jobs) | Không khả thi trên Lovable Cloud — synchronous calls hiện tại đủ dùng | **Bỏ qua** — chỉ cần nếu migrate sang infra riêng |
| CI/CD pipeline | Lovable tự động deploy — không cần CI/CD riêng | **Bỏ qua** |
| Similarity detection | Có giá trị thực — phát hiện user spam cùng nội dung nhiều lần | **Nên triển khai** |
| Manual audit tools | Có giá trị thực — admin cần UI để review flagged actions | **Nên triển khai** |

---

## Kế hoạch triển khai — 2 items còn lại

### Bước 1: Lưu file tham chiếu
- Lưu `FUN_Jira_Task_Breakdown_v1-2.docx` vào `src/config/`

### Bước 2: Similarity detection trong `pplp-v2-submit-action`
- Khi user submit action mới, so sánh `title` + `description` với 10 actions gần nhất của cùng user
- Nếu trùng >= 80% (dùng simple string similarity) → reject với warning "Nội dung quá giống với hành động trước đó"
- Cập nhật trust_level -= 0.05 nếu phát hiện spam

### Bước 3: Manual audit tools — Admin review UI
- Tạo component `PPLPv2AdminAudit` trong frontend
- Hiển thị danh sách actions có status `manual_review` hoặc bị flagged
- Admin có thể: approve (→ validated), reject (→ rejected), flag spam (→ trust decay)
- Gọi edge function `pplp-v2-validate-action` với `force_manual_review` override

## Thứ tự

| # | Việc | Files |
|---|---|---|
| 1 | Lưu file tài liệu | 1 file |
| 2 | Similarity detection | Sửa `pplp-v2-submit-action` |
| 3 | Admin audit tools | Tạo component mới + sửa Admin page |

## Chi tiết kỹ thuật
- Similarity detection dùng normalized Levenshtein distance hoặc trigram matching — tính toán nhẹ, không cần AI
- Admin audit UI cần kiểm tra quyền admin qua `user_roles` table trước khi cho phép thao tác
- Không cần migration mới — tất cả bảng đã sẵn sàng

