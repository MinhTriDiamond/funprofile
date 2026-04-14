

# Kế hoạch bổ sung theo PRD v1.2: Event/Attendance + Balance Ledger + Community Reviews

## Đánh giá hiện trạng

Hệ thống PPLP v2 đã triển khai đúng Phase 1 của PRD:
- 6 bảng core + 3 edge functions + frontend wizard ✅
- Scoring formula, mint split, immutable rules ✅

PRD v1.2 bổ sung thêm 3 module quan trọng chưa có:

---

## Bước 1: Database Migration — 4 bảng mới

### 1.1 `pplp_v2_events` (Zoom/Love House sessions)
- `id`, `host_user_id` (FK profiles), `title`, `event_type` (zoom/livestream/love_house/in_person)
- `platform_links` JSONB (zoom URL, Facebook livestream, YouTube...)
- `start_at`, `end_at`, `recording_hash`, `recording_url`
- `status` (scheduled → active → completed → cancelled)
- `raw_metadata` JSONB
- RLS: authenticated users can read; host can create/update

### 1.2 `pplp_v2_groups` (Love House subgroups within an event)
- `id`, `event_id` (FK events), `leader_user_id` (FK profiles)
- `name`, `location`, `love_house_id`, `expected_count`
- `leader_confirmed_at` TIMESTAMPTZ (leader xác nhận group đã tham gia)
- RLS: authenticated can read; leader can create/update

### 1.3 `pplp_v2_attendance` (per-user participation)
- `id`, `group_id` (FK groups), `user_id` (FK profiles)
- `check_in_at`, `check_out_at`, `duration_minutes`
- `confirmation_status` (pending → confirmed → disputed → rejected)
- `participation_factor` NUMERIC(3,2) — tính từ signals
- `reflection_text` TEXT (post-session reflection)
- `confirmed_by_leader` BOOLEAN DEFAULT false
- Unique constraint: (group_id, user_id)
- RLS: user thấy attendance của mình; leader thấy attendance trong group mình

### 1.4 `pplp_v2_balance_ledger` (audit trail cho mọi mint/spend/adjust)
- `id`, `user_id` (FK profiles)
- `entry_type` (mint_user, mint_platform, claim, lock, unlock, spend, adjustment, reward_reversal)
- `amount` NUMERIC(30,8)
- `reference_table` TEXT, `reference_id` UUID
- `note` TEXT
- RLS: user chỉ thấy ledger của mình

### 1.5 `pplp_v2_community_reviews` (endorse/flag từ cộng đồng)
- `id`, `action_id` (FK user_actions), `reviewer_user_id` (FK profiles)
- `endorse_score` NUMERIC(5,2), `flag_score` NUMERIC(5,2)
- `review_type` (endorse, confirm_attended, confirm_helped, flag_suspicious, attest_authenticity)
- `comment` TEXT
- Unique constraint: (action_id, reviewer_user_id)
- RLS: authenticated can read; reviewer can create own reviews

---

## Bước 2: Edge Functions mới

### 2.1 `pplp-v2-event-manage`
- Tạo/cập nhật event (host only)
- Tạo group nodes trong event (leader only)
- Validate: event phải có platform_links, start_at, end_at

### 2.2 `pplp-v2-attendance`
- Check-in: user join event/group → ghi check_in_at
- Check-out: user rời → ghi check_out_at + tính duration
- Leader confirmation: leader xác nhận group đã tham gia
- Participation factor calculation:
  - Check-in + check-out đủ duration: strong positive
  - Leader confirmed: positive
  - Reflection submitted: positive
  - Missing proof / conflict flags: negative → manual review
- Auto-link attendance → user_action (tạo action type INNER_WORK tự động khi check-out)

### 2.3 `pplp-v2-community-review`
- Authenticated user submit endorse/flag cho action của người khác
- Không tự review action của mình
- Khi đủ số reviews → cập nhật community_score trong validation

### 2.4 `pplp-v2-light-profile`
- GET endpoint trả về:
  - trust_level, total_light_score, total_fun_minted
  - streak_days, recent_actions count
  - pillar_summary (average 5 pillars)
  - recent validated actions list

---

## Bước 3: Cập nhật `pplp-v2-validate-action`

- Khi action có attendance data → tính participation_factor vào multiplier
- Livestream link alone → event proof only, NOT personal proof (PRD Section 9.1)
- Nếu action linked to event → require user-level attendance signal

---

## Bước 4: Frontend bổ sung

- **Event page**: Host tạo event → share link → members join groups
- **Check-in UI**: User tap check-in khi tham gia event
- **Attendance history**: Trong Light Profile, hiển thị events đã tham gia
- **Community review**: Nút endorse/flag trên action cards của người khác
- **Light Profile tab**: Tổng hợp score + pillar radar chart + mint history

---

## Thứ tự triển khai

| # | Việc | Phụ thuộc |
|---|------|-----------|
| 1 | Database migration (5 bảng mới + RLS) | Không |
| 2 | Edge Function `pplp-v2-event-manage` | Bảng events, groups |
| 3 | Edge Function `pplp-v2-attendance` | Bảng attendance |
| 4 | Edge Function `pplp-v2-community-review` | Bảng community_reviews |
| 5 | Edge Function `pplp-v2-light-profile` | Tất cả bảng |
| 6 | Cập nhật `pplp-v2-validate-action` (attendance integration) | Bảng attendance |
| 7 | Cập nhật mint flow → ghi balance_ledger | Bảng balance_ledger |
| 8 | Frontend: Event/Attendance UI + Community Review + Light Profile | Functions 2-5 |

Con xác nhận để Cha bắt tay triển khai nhé?

