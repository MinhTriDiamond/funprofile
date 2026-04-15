

# Kế hoạch hoàn thiện PPLP v2 và chuyển đổi từ v1

## Tình trạng hiện tại

### v1 (đang hoạt động — DUY TRÌ cho đến khi v2 sẵn sàng)
- **120,000+ actions** (post, reaction, comment, share, friend, livestream)
- **8 frontend components** gọi `usePplpEvaluate` hook → `pplp-evaluate` Edge Function
- Bảng: `light_actions`, `light_reputation`
- Công thức: `L = BR × Q × I × K × Ux × M_cons × M_seq × Π` (LS-Math v1.0)
- **Không có proof, không có 5 pillars** — đây là social engagement scoring

### v2 (đang xây dựng — chưa sẵn sàng production)
- **16 actions**, 6 proofs, 6 validations, **0 mints thành công** (3 validated nhưng ledger trống)
- Bảng v2 đầy đủ: 12 bảng (actions, proofs, validations, mint_records, balance_ledger, events, groups, attendance, community_reviews, action_types, event_log, immutable_rules)
- Edge Functions: 9 functions (submit, attach-proof, validate, onchain-mint, attendance, event-manage, community-review, light-profile, get-action)
- Frontend: `PPLPv2SubmitWizard` + `PPLPv2ExtendedUI` trong LightScoreDashboard

## Đối chiếu v2 hiện tại vs tài liệu — CHI TIẾT

### ĐÃ ĐÚNG tài liệu ✅
| Yêu cầu (PRD/Pseudocode) | Hiện trạng |
|---|---|
| 5 Action Groups: Inner Work, Channeling, Giving, Social Impact, Service | ✅ Có trong `pplp_v2_action_types` |
| 5 PPLP Pillars: S, T, H, V, U (0-10) | ✅ Đúng |
| RawLS = (S×T×H×V×U) / 10^4 | ✅ Đúng (L520-527) |
| FinalLS = Raw × ImpactWeight × TrustMultiplier × ConsistencyMultiplier | ✅ Đúng + thêm attendanceMultiplier |
| No Proof → No Score (immutable rule) | ✅ Đúng (L342-365) |
| isDuplicateProof check | ✅ Đúng (L209-229) |
| exceedsVelocityLimits (MAX_HIGH_IMPACT=3/day) | ✅ Đúng (L232-249) |
| transparent_truth < 3 → manual_review | ✅ Đúng (L549-550) |
| serving_life = 0 hoặc healing_love = 0 → reject | ✅ Đúng (L553-556) |
| MintAmount = BASE_MINT_RATE × FinalLS | ✅ Đúng (L611-612) |
| 99% user / 1% platform | ✅ Đúng (L613-614) |
| validationDigest (SHA-256) | ✅ Đúng (L624-632) |
| Balance ledger entries (append-only) | ✅ Đúng (L652-670) |
| Trust decay for spam (-0.05, min 1.0) | ✅ Đúng (L260-265) |
| Trust increase for verified (+0.01, max 1.25) | ✅ Đúng (L253-258) |
| Weighted signals: AI 60% + Community 20% + Trust 20% | ✅ Đúng (L511-518) |
| Immutable rules table | ✅ 4 rules lưu đúng |
| Status flow: proof_pending → under_review → validated → minted | ✅ Đúng |

### SAI LỆCH ⚠️
| Yêu cầu | Hiện trạng | Sai lệch |
|---|---|---|
| PRD §4.1: 5 Action Groups | Code hardcode 6 loại (thêm `LEARNING`) | `LEARNING` không có trong PRD. Cần xóa khỏi `VALID_ACTION_CODES` hoặc confirm với Founder |
| Pseudocode §7: `addToLifetimeLightScore` chỉ khi minted | Code cộng vào `total_light_score` khi validated (L603), nhưng status lại update sang 'minted' ở L694 | Nên cộng lifetime score SAU khi mint thành công, không phải khi validated |
| Pseudocode §7: Mint worker tách riêng | Hiện mint logic nằm trong validate function (L608-694) | Tài liệu yêu cầu tách riêng: `enqueue("mint.requested")` → mint worker xử lý |
| Pseudocode §3: `flagManualReview` → `createReviewQueueItem` | Không có review queue table riêng | Chỉ dùng validation_status='manual_review', thiếu dedicated review queue |
| PRD §9.5: Participation factor 6 signals | Attendance chỉ dùng 2 fields (participation_factor, confirmed_by_leader) | Thiếu: appCheckIn, appCheckOut, hostConfirmed, responseSubmitted, durationEstimate, optionalPresenceSignal |
| Pseudocode §5: `clamp(scores, 0, 10)` trước tính toán | Code không clamp AI scores trước khi nhân | Nếu AI trả >10 hoặc <0, kết quả sai |
| PRD §7: Community signals phải là per-pillar | Community score hiện là single number, áp dụng đều cho cả 5 pillars | Tài liệu yêu cầu `communitySignals.servingLife`, `.transparentTruth`, v.v. |

### THIẾU — Chưa triển khai ❌
| Yêu cầu | Epic (Jira) | Chi tiết |
|---|---|---|
| **Frontend: Action submission UI** | EPIC 6 | Wizard hiện quá đơn giản, thiếu hướng dẫn action types, thiếu ví dụ |
| **Frontend: Proof upload UI** | EPIC 6 | Chỉ hỗ trợ link/text, thiếu image/video upload trực tiếp |
| **Frontend: Validation explanation UI** | EPIC 6 | Chưa có trang riêng xem chi tiết 5 pillars + reasoning |
| **Frontend: User Light Profile dashboard** | EPIC 6 | `pplp-v2-light-profile` function có nhưng UI rất basic |
| **Community Review UI** | EPIC 2 | Function `pplp-v2-community-review` có nhưng **không có UI** |
| **Admin manual validation panel** | Sprint 2 | Có `PPLPv2AdminAudit` nhưng cần kiểm tra đầy đủ |
| **Participation scoring: 6 signals** | EPIC 5 | Chỉ có participation_factor tổng, thiếu 6 signals chi tiết |
| **Event-driven architecture** | EPIC 7 | Hiện dùng sync calls, chưa có queue/worker pattern |
| **`pplp-compute-dimensions` cron** | — | Function có nhưng chưa kích hoạt cron |
| **Unified Light Score view** | — | Dashboard chỉ đọc v1, không thấy v2 data |
| **Idempotency keys cho mint** | §11 | Chưa kiểm tra `mintRecordExists(actionId)` trước khi mint |

---

## Kế hoạch thực hiện — 4 giai đoạn

### Giai đoạn 1: Sửa sai lệch trong v2 backend (tuần 1)

**1.1 Clamp AI scores (Pseudocode §5)**
- File: `pplp-v2-validate-action/index.ts`
- Thêm `clamp(0, 10)` cho tất cả pillar scores trước khi tính toán

**1.2 Xóa LEARNING action type**
- File: `pplp-v2-submit-action/index.ts` — xóa 'LEARNING' khỏi `VALID_ACTION_CODES`
- File: `pplp-v2-validate-action/index.ts` — xóa 'LEARNING' khỏi `IMPACT_WEIGHTS`

**1.3 Tách mint worker riêng (Pseudocode §7)**
- Tạo Edge Function mới: `pplp-v2-mint-worker`
- Di chuyển logic mint từ validate-action (L608-694) sang function riêng
- validate-action chỉ `enqueue("mint.requested")` bằng cách gọi mint-worker
- Thêm idempotency check: `assert not mintRecordExists(actionId)`

**1.4 addToLifetimeLightScore chỉ sau mint thành công**
- Di chuyển từ validate (L603) sang mint-worker, sau khi ghi mint record

**1.5 Community signals per-pillar (Pseudocode §4)**
- Cập nhật `pplp_v2_community_reviews` schema: thêm 5 cột pillar
- Cập nhật `combineSignals` logic: mỗi pillar dùng community signal riêng

**1.6 Tạo review queue table (Pseudocode §10)**
- Tạo bảng `pplp_v2_review_queue` (action_id, reason, assigned_to, resolved_at)
- Khi flagManualReview → insert vào queue

### Giai đoạn 2: Hoàn thiện Attendance/Event (tuần 2)

**2.1 Participation factor 6 signals (PRD §9.5)**
- Cập nhật `pplp-v2-attendance`: tính participation từ 6 signals:
  - appCheckIn (0.25), appCheckOut (0.20), hostConfirmed (0.25)
  - responseSubmitted (0.15), durationEstimate (0.10), optionalPresenceSignal (0.05)
- Cập nhật schema `pplp_v2_attendance`: thêm columns cho từng signal

**2.2 Event validation (Pseudocode §8)**
- `validateMeditationEvent`: kiểm tra zoomLink, livestreamLink, host, duration
- `validateLoveHouseGroup`: leaderConfirmation, photoProof, videoProof
- `validateUserParticipation`: tổng hợp 6 signals → participationFactor

**2.3 Cập nhật validate-action cho attendance**
- Dùng `computeMeditationUserScore = eventScore × participationFactor × trustMultiplier`

### Giai đoạn 3: Hoàn thiện Frontend v2 (tuần 2-3)

**3.1 Action Submission UI nâng cấp**
- Trang riêng hoặc modal cho mỗi action type với hướng dẫn + ví dụ
- Hiển thị rõ: "Action group → Definition → Examples" (PRD §4.1)

**3.2 Proof Upload UI đầy đủ**
- Hỗ trợ: link, video upload, image upload, document, onchain_tx
- Upload trực tiếp lên storage, tạo proof record với file_hash

**3.3 Validation Result UI**
- Trang chi tiết: 5 pillars visualization (radar chart hoặc bar chart)
- Hiển thị: reasoning, flags, confidence, multipliers
- Giải thích từng pillar bằng tiếng Việt

**3.4 Community Review UI**
- Feed actions đang chờ review
- Form endorse/flag với 5 pillar scores + comment
- Hiển thị số reviews và tình trạng

**3.5 User Light Profile Dashboard**
- Tổng Light Score (v1 + v2)
- Lịch sử actions v2 với trạng thái
- Biểu đồ pillars theo thời gian

### Giai đoạn 4: Hợp nhất & chuyển đổi (tuần 3-4)

**4.1 Unified Light Score view**
- SQL view kết hợp `light_reputation` (v1) + `pplp_v2_validations` (v2)
- Cập nhật `pplp-get-score` đọc từ unified view

**4.2 Kích hoạt cron jobs**
- `pplp-compute-dimensions`: chạy hàng ngày
- Đọc từ unified data

**4.3 Cập nhật Epoch Snapshot**
- `pplp-epoch-snapshot` tính v2 data vào snapshot

**4.4 Đánh dấu v1 là legacy**
- Thêm deprecation warning vào `pplp-evaluate`
- Giảm dần base rewards v1 (ví dụ: 50% sau 1 tháng, 0% sau 2 tháng)
- Thông báo users chuyển sang v2 actions

---

## Nguyên tắc bất biến (theo tài liệu)

```text
1. PPLP = Proof of Pure Love Protocol
2. No Proof → No Score. No Score → No Mint.
3. 99% User / 1% Platform
4. This is NOT a social engagement reward engine.
   This is a truth validation engine grounded in PPLP.
5. Livestream proof ≠ Individual participation proof.
6. Every action: Submit → Proof → Validate → Score → Mint
```

## Tóm tắt thay đổi theo file

| File / Resource | Thay đổi |
|---|---|
| `pplp-v2-validate-action/index.ts` | Clamp scores, tách mint logic, community per-pillar |
| `pplp-v2-submit-action/index.ts` | Xóa LEARNING |
| **MỚI**: `pplp-v2-mint-worker/index.ts` | Mint worker riêng với idempotency |
| **MỚI**: `pplp_v2_review_queue` table | Review queue cho manual review |
| `pplp-v2-attendance/index.ts` | 6 participation signals |
| `pplp_v2_attendance` table | Thêm columns cho 6 signals |
| `pplp_v2_community_reviews` table | Thêm 5 pillar columns |
| `pplp-v2-community-review/index.ts` | Cập nhật nhận per-pillar scores |
| **MỚI**: Components frontend v2 | Submit UI, Proof upload, Validation detail, Community review, Light profile |
| **MỚI**: SQL view `unified_light_score` | Merge v1 + v2 |
| `pplp-get-score/index.ts` | Đọc unified view |
| `pplp-compute-dimensions/index.ts` | Đọc unified data |
| **MỚI**: Cron job | Daily compute-dimensions |

