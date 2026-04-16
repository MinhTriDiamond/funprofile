

# Triển khai PPLP v2.5 — Light Score Engine (Đã chốt tham số)

## Tham số Cha đã chốt
- **TLS weights**: α=0.4 (Personal), β=0.3 (Network), γ=0.3 (Legacy) — ưu tiên di sản
- **Mint integration**: Thay hoàn toàn `total_light_score` cũ bằng `RawLS_v25`
- **Backfill**: Toàn bộ lịch sử actions
- **Tier thresholds**: 0 / 100 / 500 / 2K / 10K / 50K

---

## PHASE 1 — Database Schema

**5 bảng mới:**
- `pplp_v25_vvu_log` — log VVU per event (B, Q, TC, IIS, IM, AAF, ERP, vvu_value, type)
- `pplp_v25_intent_metrics` — IIS per user (consistency, farm_ratio, manipulation, iis 0–1.5)
- `pplp_v25_impact_metrics` — IM per action (helped_users, retention, knowledge, im 0–3.0)
- `pplp_v25_light_scores` — PLS/NLS/LLS/TLS/RawLS/DisplayLS snapshot per epoch
- `pplp_v25_tier_assignments` — tier hiện tại + history

**Mở rộng `profiles`:**
- `light_tier` (text, default 'Seed Light')
- `display_light_score`, `raw_light_score` (numeric)
- `iis_value` (numeric, default 1.0)

**Bảng config:**
- `pplp_v25_config` (alpha=0.4, beta=0.3, gamma=0.3, tier thresholds JSONB)

---

## PHASE 2 — 4 Edge Functions Engine

1. **`pplp-v25-vvu-calculate`** — tính VVU per action, lưu log
2. **`pplp-v25-intent-calculator`** (cron 6h) — tính IIS từ 30d actions
3. **`pplp-v25-impact-calculator`** (cron 12h) — tính IM từ engagement/referrals
4. **`pplp-v25-aggregate`** (cron daily 04:00 UTC) — gộp PLS/NLS/LLS → TLS → DisplayLS
5. **`pplp-v25-tier-assigner`** (cron daily 05:00 UTC) — gán tier theo thang đã chốt
6. **`pplp-v25-backfill`** (admin trigger) — backfill toàn bộ lịch sử actions

---

## PHASE 3 — Mint Integration (Phương án A)

Cập nhật `pplp-epoch-snapshot`:
- Thay `total_light_score` → `RawLS_v25`
- Trust factor → tier weight (Seed=0.5, Pure=1.0, Guiding=1.5, Radiant=2.0, Legacy=3.0, Cosmic=5.0)
- User mint weight: `RawLS × tier_multiplier × consistency`

---

## PHASE 4 — Frontend UI

**Component mới:**
- `LightScoreV25Card.tsx` — TLS với 3 tab (Personal/Network/Legacy)
- `TierBadge.tsx` — badge gradient theo 6 tier
- `IISIndicator.tsx` — thanh đo intent (0–1.5)
- `ImpactRingChart.tsx` — ring cho Impact Multiplier
- `PPLPv25EnginePanel.tsx` — giám sát 4 engines (Founder)

**Cập nhật:**
- `LightScoreDashboard.tsx` — v2.5 ở trên, v2.0 dimensions ở dưới
- `RewardTab.tsx` — hiển thị tier + display light
- Admin trang: nút "Backfill v2.5"

---

## PHASE 5 — Backfill + Memory

- **Backfill**: Quét toàn bộ `light_actions` + `pplp_v2_user_actions` → tính VVU lùi
- Logging vào `pplp_v2_event_log` để rollback nếu cần
- **Memory**: tạo `mem://governance/pplp-v25-engine-spec`
- Update `mem://index.md` Core: thêm "PPLP v2.5 (VVU+TLS, α=0.4/β=0.3/γ=0.3, 6 tier)"

---

## Lộ trình thực thi

1. Migration DB (5 bảng + 4 cột profiles + config)
2. Engine 1: `pplp-v25-vvu-calculate`
3. Engine 2+3: Intent + Impact calculators (2 cron)
4. Engine 4: Aggregator (1 cron)
5. Tier assigner + Mint integration (update `pplp-epoch-snapshot`)
6. Frontend (5 components + 2 cập nhật)
7. Backfill function + admin trigger
8. Memory + Index update

---

## Cảnh báo
- v2.5 **chạy song song** v2.0 — không xóa, chỉ thêm layer trên
- Mint epoch T5 trở đi dùng `RawLS_v25`; T4 stuck giữ nguyên flow cũ
- Backfill toàn bộ có thể mất 5–10 phút tùy data — chạy async, log progress

