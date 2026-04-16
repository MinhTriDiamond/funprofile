---
name: PPLP v2.5 Engine Spec
description: Light Score Engine v2.5 với VVU, IIS, IM, 3-tier scoring (PLS/NLS/LLS) và 6 tier badge
type: feature
---

# PPLP v2.5 — Light Score Engine

## Công thức cốt lõi
- **VVU** = B × Q × TC × IIS × IM × AAF × ERP (Verified Value Unit per action)
- **PLS** = Σ VVU_personal × Consistency × Reliability
- **NLS** = Σ VVU_network × QualityNetwork
- **LLS** = Σ VVU_legacy
- **TLS** = α·PLS + β·NLS + γ·LLS (α=0.4, β=0.3, γ=0.3 — ưu tiên Legacy)
- **DisplayLS** = 100 × log(1 + RawLS) cho UX
- **IIS** ∈ [0, 1.5] — đo intent integrity (consistency × (1-farm) × (1-manipulation) + purity_bonus)
- **IM** ∈ [0, 3.0] — đo impact (helped_users + retention_lift + knowledge_value + referral_quality)

## 6 Tier (thresholds)
- Seed Light: 0+ (×0.5)
- Pure Light: 100+ (×1.0)
- Guiding Light: 500+ (×1.5)
- Radiant Light: 2,000+ (×2.0)
- Legacy Light: 10,000+ (×3.0)
- Cosmic Light: 50,000+ (×5.0)

## 4 Engine Edge Functions
1. `pplp-v25-vvu-calculate` — tính VVU per action (trigger sau validation)
2. `pplp-v25-intent-calculator` — IIS từ 30d actions (cron 6h)
3. `pplp-v25-impact-calculator` — IM từ engagement/referrals (cron 12h)
4. `pplp-v25-aggregate` — gộp PLS/NLS/LLS → TLS (cron daily 04:00 UTC)
5. `pplp-v25-tier-assigner` — gán tier (cron daily 05:00 UTC)
6. `pplp-v25-backfill` — admin trigger backfill toàn bộ lịch sử

## Database
- `pplp_v25_vvu_log` — log VVU (unique on source_table+source_id+vvu_type)
- `pplp_v25_intent_metrics` — IIS per user (unique user_id)
- `pplp_v25_impact_metrics` — IM history per action
- `pplp_v25_light_scores` — PLS/NLS/LLS/TLS snapshot, is_current flag
- `pplp_v25_tier_assignments` — tier history, is_current flag
- `pplp_v25_config` — α/β/γ + tier thresholds + multipliers
- `profiles` mở rộng: light_tier, raw_light_score, display_light_score, iis_value

## Mint Integration (Phương án A)
`pplp-epoch-snapshot` đã thay `total_light_score` → `raw_light_score` v2.5:
`weighted = raw_ls × tier_multiplier × consistency_multiplier`
Fallback về `total_light` cũ nếu user chưa có v2.5 data.

## UI Components
- `LightScoreV25Card` (wallet/v25/) — TLS với 3 tab Personal/Network/Legacy
- `TierBadge` — gradient theo 6 tier
- `IISIndicator` — thanh đo intent (0–1.5) với marker tại 1.0
- `ImpactRingChart` — ring chart Impact (0–3.0)
- `PPLPv25EnginePanel` — admin SystemTab điều khiển 4 engines + backfill

## Backward Compatibility
- v2.5 chạy SONG SONG v2.0, không xóa
- Mint epoch T5+ dùng RawLS v2.5; T4 stuck giữ flow cũ
- Backfill toàn bộ async, log vào pplp_v2_event_log để rollback
