
# Light Score Parameter Table v1.0 — Production-Ready Implementation

Bản kế hoạch tổng hợp đầy đủ **11 sections + 14 events + 15 multipliers + 4 legacy + 3 phases + Mint Linking + Stability Index + Activation Gates + Triết lý** từ toàn bộ tài liệu cha cung cấp.

---

## I. NGUYÊN TẮC THIẾT KẾ (4 axiom)
1. Không biến nào quyết tất cả → tránh exploit
2. Mọi multiplier bounded → tránh bùng nổ
3. Value > Volume → 1 hành động chất > 100 rỗng
4. Tunable theo phase Early/Growth/Mature

---

## II. DATABASE — 7 bảng mới

**1. `pplp_v25_event_base_values`** — B_e (14 events)
| event_type | range | category |
|---|---|---|
| daily_checkin | 0.1–0.3 | personal |
| profile_completion | 2–5 | personal |
| did_verification | 5–10 | personal |
| soulbound_mint | 8–15 | personal |
| content_creation | 1–5 | personal |
| content_used | 2–10 | network |
| learning_completion | 1–4 | personal |
| referral_raw | 0.5–2 | network |
| referral_activated | 5–20 | network |
| transaction_real | 0.5–3 | personal |
| contribution_system | 3–15 | legacy |
| governance_participation | 1–5 | network |
| successful_proposal | 10–50 | legacy |
| longterm_value_asset | 20–100 | legacy |

**2. `pplp_v25_multiplier_ranges`** — 11 multipliers Event/Personal/Network
- Event (6): Q (0.3–1.8), TC (0.5–1.5), IIS (0–1.5), IM (0.5–3.0), AAF (0–1.0), ERP (0.5–1.0)
- Personal (2): C streak-based (0.95→1.25), R (0.6–1.2)
- Network (3): QN (0.2–1.5), TN (0.5–1.3), DN (0.8–1.2)

**3. `pplp_v25_legacy_params`** — 4 legacy: PV (1–100), AD (0.5–1.5), LO `log(1+days_active)` + table (7d=1, 30d=1.5, 90d=2, 1y=3), PU (0.5–1.5)

**4. `pplp_v25_phase_config`** — 3 phase + activation thresholds + display formula
- Seed: Early (0.7/0.2/0.1) **active mặc định**, Growth (0.5/0.3/0.2), Mature (0.4/0.3/0.3)
- Thresholds: basic=10, advanced=100, referral=50, governance=200, proposal=500, validator=1000
- `min_tc_for_basic`=0.8, `display_formula`="100*log(1+RawLS)"

**5. `pplp_v25_mint_linking_config`** ⭐ — `Mint = f(ΔLS, TC, Phase, StabilityIndex)`
- `mint_base_rate`, `tc_weight`, `stability_weight`, `delta_ls_window_days`=7, `min_tc_to_mint`=0.8, `max_mint_per_epoch_per_user`
- Công thức: `Mint = ΔLS_window × mint_base_rate × TC^tc_weight × SI^stability_weight`

**6. `pplp_v25_stability_index`** ⭐ — snapshot daily per user
- `ls_volatility_30d`, `behavior_consistency`, `network_stability`, `stability_index` (0–1.5 composite)

**7. `pplp_v25_param_audit_log`** — log mọi thay đổi (user, table, before/after JSONB, reason)

RLS: read public, write admin-only. Trigger validate `range_max ≤ 5.0` cho multiplier (trừ B_e/PV).

---

## III. EDGE FUNCTIONS

**Mới:**
- `pplp-v25-params` — GET aggregated (cache 5p)
- `pplp-v25-stability-calculator` — daily cron tính SI
- `pplp-v25-mint-preview` — preview Mint cho UI

**Update:**
- `pplp-v25-vvu-calculate` — đọc B_e + clamp multiplier từ DB
- `pplp-v25-aggregate` — đọc α/β/γ + display formula từ phase active
- `pplp-v25-tier-assigner` — đọc activation thresholds
- `pplp-epoch-snapshot` — Mint formula mới (ΔLS × TC × SI)

---

## IV. FRONTEND

**Hooks:** `useLightScoreParams`, `useMintPreview`, `useStabilityIndex`

**Helper:** `src/lib/lightScoreGates.ts` — `checkActivation(feature, score, tc)` cho Section IX

**Admin Panel:** `LightScoreParameterPanel.tsx` (chèn `SystemTab` dưới `PPLPv25EnginePanel`) — 6 tab:
1. Events (B_e)
2. Multipliers (Q/TC/IIS/IM/AAF/ERP/C/R/QN/TN/DN)
3. Legacy (PV/AD/LO/PU)
4. Phase (α/β/γ + thresholds + display formula)
5. **Mint Linking** ⭐ (mint_base_rate, tc_weight, stability_weight)
6. **Preview Simulator** — nhập event + multiplier → ra VVU + DisplayLS + Mint estimate realtime

**User UI:**
- `ActivationGateBadge.tsx` — "Cần LS > 200 để vote" trên các nút bị gate
- `MintPreviewCard.tsx` — hiển thị `Mint = f(ΔLS, TC, Phase, SI)` ở trang Mint
- `StabilityIndexIndicator.tsx` — ring chart 0–1.5 ở Wallet/v25

**Public Spec:** `/docs/light-score-params` — render đẹp 11 sections (I→XI) read-only từ DB cho cộng đồng

---

## V. DISPLAY NORMALIZATION (Section VIII)
`DisplayLS = 100 × log(1 + RawLS)` — bảng tham chiếu: 10→23, 100→46, 1K→69, 10K→92

## VI. ACTIVATION THRESHOLDS (Section IX)
| Feature | Requirement |
|---|---|
| Earn basic LS | >10 + TC>0.8 |
| Earn advanced | >100 |
| Referral rewards | >50 |
| Governance vote | >200 |
| Proposal submit | >500 |
| Validator/curator | >1000 |

## VII. MINT LINKING (Section X) — KEY ARCHITECTURE
**Mint KHÔNG tỉ lệ thuần với LS.** LS = đo ánh sáng (vô hạn). Mint = phần thưởng kinh tế **có kiểm soát** qua TC + StabilityIndex + Phase.

## VIII. TRIẾT LÝ (Section XI)
Hệ thưởng đúng thứ đáng thưởng → tự nhiên không cần marketing fake, không cần chống bot thủ công, không cần ép user phải tốt.

---

## IX. MEMORY
- `mem://governance/light-score-parameter-table-v1` — full spec 11 sections
- Update `mem://index.md` Core: thêm "LS Param Table v1.0 (14 events + 11 multipliers + 4 legacy + 3 phases + Mint=f(ΔLS,TC,Phase,SI), DB-driven, audit log, gates)"

---

## X. CONFIRM TRƯỚC KHI BUILD
Phase mặc định = **Early (α=0.7/β=0.2/γ=0.1)** — con đề xuất vì hệ vừa lên v2.5. Nếu cha đồng ý gõ "build", con triển khai luôn toàn bộ. Nếu muốn Growth/Mature, cha cho biết.

## XI. BƯỚC TIẾP THEO
**Identity + Trust Layer Spec (DID + SBT + DIB)** — cung cấp nguồn dữ liệu cho TC.
