
# Dong bo Scoring Engine theo LS-Math-v1.0

## Trang thai: ✅ HOAN THANH (02/03/2026)

## Tong ket thuc hien

### Buoc 1 — Them cot streak vao bang `light_reputation` ✅
- Da them: `consistency_streak`, `last_active_date`, `sequence_bonus`

### Buoc 2 — Cap nhat `pplp-evaluate` Edge Function ✅
- Cong thuc moi: `Light Score = BR × Q × I × K × Ux × M_cons × M_seq × Π`
- M_cons: `1 + 0.6(1 - e^(-streak/30))`
- M_seq: `1 + 0.5·tanh(bonus/5)`
- Integrity Penalty: `1 - min(0.5, 0.8·risk)`
- Auto-update streak moi action
- Luu multiplier vao audit trail columns

### Buoc 3 — Cap nhat `src/config/pplp.ts` ✅
- LS_MATH_CONFIG day du: weights, reputation, content.type_multiplier, consistency, sequence, penalty, mint
- Helper functions: calculateConsistencyMultiplier, calculateSequenceMultiplier, calculateIntegrityPenalty, calculateReputationWeight, normalizeContentScore
- calculateLightScore cap nhat 8 tham so (tuong thich nguoc voi default = 1.0)

### Buoc 4 — Them cot audit vao `light_actions` ✅
- Da them: `consistency_multiplier`, `sequence_multiplier`, `integrity_penalty`, `streak_days`

### Buoc 5 — Cap nhat `useLightScore` hook ✅
- Them `consistency_streak` va `sequence_bonus` vao `LightScoreData` interface

### Buoc 6 — Cap nhat `pplp-get-score` Edge Function ✅
- Tra ve `consistency_streak` va `sequence_bonus` tu light_reputation

## Anh huong
- Light Score TANG cho user deu dan (multiplier > 1.0)
- Tuong thich nguoc: actions cu giu multiplier mac dinh = 1.0
- He thong cu (pplp-submit-action): khong can sua (khong dung)
