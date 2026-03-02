
# Dong bo Scoring Engine theo LS-Math-v1.0

## Hien trang

Hien tai co **3 he thong tinh diem** khong dong bo:

```text
1. pplp-evaluate (DANG CHAY)
   Formula: BR x Q x I x K x Ux
   Ghi vao: light_actions
   Goi tu: usePplpEvaluate.ts (frontend)

2. pplp-submit-action + pplp-score-action (CU/KHONG DUNG)
   Formula: 5-pillar weighted scoring
   Ghi vao: pplp_actions + pplp_scores
   Khong duoc goi tu frontend

3. Tai lieu LS-Math-v1.0 (CHI LA TAI LIEU)
   Formula: (0.4xB + 0.6xC) x M_cons x M_seq x Penalty
   Chua co code nao implement
```

## Muc tieu

Dong bo **pplp-evaluate** (he thong dang chay that) de tich hop cac yeu to tu LS-Math-v1.0, dong thoi giu nguyen tinh tuong thich nguoc.

## Ke hoach thuc hien

### Buoc 1 — Them cot streak vao bang `light_reputation`

Them cac cot can thiet de luu streak va sequence data:

```sql
ALTER TABLE light_reputation
  ADD COLUMN IF NOT EXISTS consistency_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS sequence_bonus NUMERIC DEFAULT 0;
```

### Buoc 2 — Cap nhat `pplp-evaluate` Edge Function

Tich hop 3 multiplier moi vao logic tinh diem hien tai:

**Cong thuc moi:**
```text
Light Score = BR x Q x I x K x Ux x M_cons x M_seq x Integrity_Penalty
```

Cu the:
- **M_cons** (Consistency Multiplier): `1 + 0.6 * (1 - e^(-streak/30))`
  - Doc `consistency_streak` tu `light_reputation`
  - Sau khi tinh xong, cap nhat streak: neu `last_active_date = hom qua` thi streak +1, neu khac thi reset ve 1
- **M_seq** (Sequence Multiplier): `1 + 0.5 * tanh(bonus/5)`
  - Tinh `bonus` tu so mentor chains hoan thanh trong thang
- **Integrity Penalty**: `1 - min(0.5, 0.8 * risk)`
  - `risk` lay tu `integrity_score` (risk = 1 - integrity_score)

Thay doi trong file: `supabase/functions/pplp-evaluate/index.ts`

### Buoc 3 — Cap nhat `src/config/pplp.ts`

Them cac hang so LS-Math-v1.0:

```typescript
export const LS_MATH_CONFIG = {
  weights: { base_action: 0.4, content: 0.6 },
  consistency: { beta: 0.6, lambda: 30 },
  sequence: { eta: 0.5, kappa: 5 },
  penalty: { theta: 0.8, max_penalty: 0.5 },
  mint: { anti_whale_cap: 0.03, min_light_threshold: 10 },
};
```

### Buoc 4 — Cap nhat `light_actions` table

Them cot de luu multiplier cho audit trail:

```sql
ALTER TABLE light_actions
  ADD COLUMN IF NOT EXISTS consistency_multiplier NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS sequence_multiplier NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS integrity_penalty NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
```

### Buoc 5 — Cap nhat useLightScore hook

Them hien thi streak va multiplier info trong dashboard:
- Them `consistency_streak` va `sequence_bonus` vao `LightScoreData` interface
- Hien thi streak hien tai cua user

### Buoc 6 — Cap nhat `pplp-get-score` Edge Function

Tra ve them `consistency_streak` va `sequence_bonus` trong response data.

## Anh huong

- **Light Score se TANG** so voi truoc (vi them multiplier > 1.0 cho user deu dan)
- **Tuong thich nguoc**: Cac action cu khong bi anh huong (multiplier mac dinh = 1.0)
- **pplp-submit-action + pplp-score-action**: Khong can sua (he thong cu, khong dung)
- **Tai lieu**: Da dung san, khong can cap nhat

## Thu tu thuc hien

1. Migration DB (them cot)
2. Cap nhat `src/config/pplp.ts` (them constants)
3. Cap nhat `pplp-evaluate/index.ts` (logic chinh)
4. Cap nhat `pplp-get-score` (tra ve streak)
5. Cap nhat `useLightScore.ts` (hien thi)
