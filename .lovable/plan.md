

# Triển khai FUN Monetary Expansion v1 + Epoch System v1 (Toàn bộ 4 Phase)

## Tham số Cha đã chốt
- **Phạm vi**: Triển khai cả 4 Phase trong 1 lần, rà soát kỹ.
- **Soft Ceiling**: 5M FUN/tuần (~20M FUN/tháng).
- **Migration epoch T4**: 26 requests đang stuck (12 signed + 14 failed) sẽ được chia 15% instant + 85% locked, auto-resubmit qua flow mới.

---

## PHASE 1 — Monetary Foundation

**Database migration:**
- Mở rộng `mint_epochs`: thêm `base_expansion`, `contribution_expansion`, `ecosystem_expansion`, `discipline_modulator`, `final_mint`, `system_stage`, `soft_ceiling`.
- Bảng mới: `epoch_config` (base_rate, alpha/beta/gamma, modulator weights), `epoch_metrics` (verified_score, usage_index, fraud_pressure), `inflation_health_metrics`.
- Mở rộng `mint_allocations`: `instant_amount`, `locked_amount`, `trust_band`, `vesting_schedule_id`.

**Edge function `pplp-epoch-snapshot` rewrite:**
```
TotalMint = BaseExpansion + ContributionExpansion + EcosystemExpansion
AdjustedMint = TotalMint × DisciplineModulator
FinalMint = clamp(MinMint, AdjustedMint, 5_000_000)  -- 5M/tuần
```
- Normalize: `log(1+VLS)`, `sqrt(1+VCV)` chống cá voi.
- Allocation 5 buckets: User 70% / Ecosystem 12% / Treasury 10% / Strategic 5% / Resilience 3%.
- User reward: `UserPool × (PPLPScore × Trust × Consistency × Utility) / Σ`.

---

## PHASE 2 — Lock/Unlock System

**Database:**
- Bảng mới `reward_vesting_schedules` (allocation_id, total, instant, locked, unlock_history JSONB, status).

**Edge functions:**
- `pplp-vesting-release` (cron daily): tính `Unlockable = BaseVesting + ContributionUnlock + UsageUnlock + ConsistencyUnlock`, auto-activate.
- Cập nhật `pplp-auto-submit`: chuyển từ `mintValidatedAction` → `mintValidatedActionLocked` với 15% instant + 85% locked, `releaseAt` từ vesting schedule.

**UI:**
- `RewardTab.tsx`, `ClaimRewardsSection.tsx`: bỏ chữ "Activate", thay bằng "Đang mở dần" / "Sẵn sàng sử dụng".
- One-click "Receive" hoặc "Use Now".
- Component mới `VestingProgress.tsx` hiển thị tiến độ unlock.

---

## PHASE 3 — Epoch Layers + Anti-Farm

**Database:**
- Bảng mới `user_epoch_scores` (preview_score, validated_score, finalized_score, consistency_factor, burst_penalty, trust_ramp_factor).

**Edge functions cron mới:**
- `pplp-micro-preview` (daily): preview score 7-day rolling.
- `pplp-validation-window` (daily): rolling 14-day validated.
- `pplp-burst-detector`: phát hiện activity spike, áp dụng diminishing returns.

**8 Timing Defenses:**
1. Rolling windows 7/14/28d (không reset cứng).
2. ConsistencyFactor = active_days / total_days.
3. Trust ramp: user mới giảm weight + tăng lock 1-2 epochs đầu.
4. Diminishing returns cho burst.
5. Delayed trust ramp.
6. Event clustering detection.
7. Late-window suppression (24-48h cuối giảm weight).
8. Cross-window continuity bonus.

**UI:** Dashboard live "Phần thưởng Ánh Sáng đang tích lũy" với preview score.

---

## PHASE 4 — Treasury Recycle + Health Monitor

**Database:**
- Bảng mới `treasury_vaults` (5 vaults: RewardReserve, Infrastructure, CommunityGrowth, Stability, StrategicExpansion).
- Bảng mới `treasury_flows` (source, destination_vault, amount, reason).

**Edge functions:**
- `treasury-recycle`: route platform fees vào vault theo policy.
- `inflation-health-job` (daily): tính 5 health ratios (Value Expansion / Utility Absorption / Retention Quality / Fraud Pressure / Locked Stability).

**Founder Dashboard:**
- Panel mới `FounderMonetaryHealthPanel`: charts 5 ratios, supply growth vs utility growth, treasury vault balances.
- Safe Mode trigger UI: low_issuance / higher_lock / anomaly_review.

---

## Migration epoch T4 đang stuck

**Edge function mới `migrate-stuck-epoch-april`** (one-time admin script):
1. Quét 26 requests `signed`/`failed` của epoch T4.
2. Với mỗi request: tạo `reward_vesting_schedule` (15% instant, 85% locked, releaseAt = now + 28 ngày).
3. Reset `status` về `pending_sig` + clear `tx_hash`/`error`.
4. Tăng `total_cap` epoch T4 lên 20M FUN để tránh `EPOCH_CAP` revert.
5. Trigger `pplp-auto-submit` chạy với contract function mới `mintValidatedActionLocked`.
6. Gửi notification `epoch_claim_ready` cho user khi instant 15% lên blockchain.

---

## Lộ trình thực thi (theo thứ tự)

1. **Migration DB** (Phase 1+2+3+4 schema gộp 1 migration).
2. **Phase 1 backend**: rewrite `pplp-epoch-snapshot`, deploy.
3. **Phase 2 backend**: tạo `pplp-vesting-release`, update `pplp-auto-submit`, deploy + cron.
4. **Phase 3 backend**: tạo 3 cron jobs anti-farm, deploy.
5. **Phase 4 backend**: tạo `treasury-recycle` + `inflation-health-job`, deploy + cron.
6. **Frontend**: cập nhật RewardTab, ClaimRewardsSection, FunMoneyGuide, FounderDashboard + component mới.
7. **Migration epoch T4 stuck**: chạy `migrate-stuck-epoch-april` qua admin trigger.
8. **Memory updates**: tạo `mem://governance/fun-monetary-expansion-spec-v1`, `mem://governance/epoch-system-spec-v1`, update index.

---

## Cảnh báo quan trọng

- **Contract `FUNMoneyMinter-2.sol` đã có sẵn** `mintValidatedActionLocked` → không cần redeploy contract. ✅
- **EPOCH_CAP**: cap ở backend, không ở contract → chỉ cần update `total_cap` trong DB. ✅
- **Backward compat**: pending requests cũ giữ nguyên flow, chỉ epoch T4 stuck + epoch mới T5 trở đi áp dụng v1.
- **Risk migration T4**: 26 requests sẽ thay đổi state — con sẽ log đầy đủ vào `pplp_v2_event_log` để rollback nếu cần.

