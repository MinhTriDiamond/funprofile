

# Kế hoạch chi tiết: Nâng cấp Light Score 5 Trụ Cột (Phase 1)

## Hiện trạng đã xác nhận

**Có sẵn:**
- Bảng `light_reputation`: lưu action-level PPLP scores (pillar_service/truth/healing/value/unity), streak, tier, tổng điểm
- Bảng `pplp_fraud_signals`: severity, is_resolved — dùng cho Transparency & Risk Penalty
- Bảng `donations`: sender_id, recipient_id, amount, status — dùng cho OnChain & Ecosystem
- Bảng `profiles`: avatar_url, bio, display_name, location, wallet_address, law_of_light_accepted, created_at, education, workplace — dùng cho Identity
- Config `TIERS` trong `pplp.ts`: 4 cấp (0/1000/10000/100000) — cần cập nhật theo whitepaper
- Edge function `pplp-get-score` trả dữ liệu từ RPC `get_user_light_score` + `light_reputation`
- **Không có** bảng `user_dimension_scores`, `pplp_light_levels`, hay `user_wallet_addresses`

---

## Thay đổi cụ thể

### 1. Database Migration — Tạo bảng `user_dimension_scores`

```sql
CREATE TABLE public.user_dimension_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_score NUMERIC DEFAULT 0,
  activity_score NUMERIC DEFAULT 0,
  onchain_score NUMERIC DEFAULT 0,
  transparency_score NUMERIC DEFAULT 100,
  ecosystem_score NUMERIC DEFAULT 0,
  risk_penalty NUMERIC DEFAULT 0,
  streak_bonus_pct NUMERIC DEFAULT 0,
  inactive_days INTEGER DEFAULT 0,
  decay_applied BOOLEAN DEFAULT FALSE,
  total_light_score NUMERIC DEFAULT 0,
  level_name TEXT DEFAULT 'Light Seed',
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: user đọc dữ liệu của mình
ALTER TABLE public.user_dimension_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own scores" ON public.user_dimension_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### 2. Edge Function mới — `pplp-compute-dimensions/index.ts`

Tính 5 dimension cho 1 user (gọi qua cron hoặc on-demand):

| Dimension | Max | Nguồn dữ liệu | Công thức |
|-----------|-----|---------------|-----------|
| **Identity** | 100 | `profiles` | display_name (10) + avatar_url (10) + bio (5) + location (5) + wallet_address (30) + law_of_light_accepted (20) + account_age >30d (20) |
| **Activity** | 100 | `light_reputation` | Normalize `total_light_score` về 0-100 (log scale, cap) |
| **OnChain** | 100 | `profiles.wallet_address` + `donations` | wallet linked (30) + has donations sent (30) + has donations received (20) + first donation >30d ago (20) |
| **Transparency** | 100 | `pplp_fraud_signals` | Start 100, trừ per unresolved signal: sev 1-3 → -5, sev 4-6 → -15, sev 7-10 → -30. Min 0 |
| **Ecosystem** | 100 | `posts`, `comments`, `donations`, `light_reputation` | posts >0 (15) + comments >0 (15) + donations sent (20) + donations received (15) + streak >7d (15) + law_of_light (20) |

**Risk Penalty** = tổng severity unresolved fraud signals, cap 80
**Streak Bonus** = streak 7d: +2%, 30d: +5%, 90d: +10%
**Time Decay** = inactive 30d: activity×0.85, 60d: ×0.6, 90d: ×0.3, 180d: ×0

**Total** = `(identity + activity + onchain + transparency + ecosystem) × 0.2 × (1 + streak_bonus) - risk_penalty`. Clamp 0-1000.

**Level**: 0-99 Seed, 100-249 Builder, 250-499 Guardian, 500-799 Leader, 800+ Cosmic

### 3. Cập nhật `pplp-get-score/index.ts`

Thêm query `user_dimension_scores` cho user, trả thêm field `dimensions` trong response:

```json
{
  "dimensions": {
    "identity": 75, "activity": 60, "onchain": 40,
    "transparency": 95, "ecosystem": 50
  },
  "dimension_total": 320,
  "dimension_level": "Guardian",
  "risk_penalty": 5,
  "streak_bonus_pct": 2,
  "inactive_days": 0
}
```

### 4. Cập nhật `src/config/pplp.ts`

Thêm constants:

```typescript
export const DIMENSION_WEIGHTS = { identity: 0.2, activity: 0.2, onchain: 0.2, transparency: 0.2, ecosystem: 0.2 };

export const DIMENSION_LEVELS = {
  0: { name: 'Light Seed', minScore: 0, emoji: '🌱' },
  1: { name: 'Light Builder', minScore: 100, emoji: '🔨' },
  2: { name: 'Light Guardian', minScore: 250, emoji: '🛡️' },
  3: { name: 'Light Leader', minScore: 500, emoji: '👑' },
  4: { name: 'Cosmic Contributor', minScore: 800, emoji: '🌌' },
};

export const DIMENSIONS = {
  identity: { name: 'Identity', nameVi: 'Danh tính', emoji: '🪪', color: 'blue' },
  activity: { name: 'Activity', nameVi: 'Hoạt động', emoji: '⚡', color: 'amber' },
  onchain: { name: 'On-Chain', nameVi: 'On-Chain', emoji: '⛓️', color: 'purple' },
  transparency: { name: 'Transparency', nameVi: 'Minh bạch', emoji: '🔍', color: 'green' },
  ecosystem: { name: 'Ecosystem', nameVi: 'Hệ sinh thái', emoji: '🌐', color: 'rose' },
};
```

### 5. Hook mới — `src/hooks/useDimensionScores.ts`

Đọc dimension data từ response `pplp-get-score` (đã bổ sung ở bước 3), extend `LightScoreData` interface.

### 6. UI — Nâng cấp `LightScoreDashboard.tsx`

Thêm section **5 Trụ Cột Danh Tiếng** phía trên phần PPLP pillars hiện tại:

- 5 dimension cards (icon + tên + progress bar 0-100 + điểm)
- Radar chart 5 chiều (Recharts — đã cài)
- Level badge mới (Seed/Builder/Guardian/Leader/Cosmic)
- Risk Penalty + Streak indicator
- Giữ nguyên phần PPLP pillars bên dưới (Service/Truth/Healing/Value/Unity)

### 7. Tài liệu — `docs/LIGHT_SCORE_MATH_SPEC.md`

Tạo file spec mô tả 5 dimension, công thức, decay, streak, risk penalty.

---

## Tổng kết

| # | Loại | Resource |
|---|------|----------|
| 1 | DB Migration | Tạo `user_dimension_scores` + RLS |
| 2 | Edge Function mới | `pplp-compute-dimensions/index.ts` |
| 3 | Edge Function sửa | `pplp-get-score/index.ts` thêm dimension query |
| 4 | Config sửa | `src/config/pplp.ts` thêm DIMENSION constants |
| 5 | Hook mới | `src/hooks/useDimensionScores.ts` |
| 6 | UI sửa | `LightScoreDashboard.tsx` thêm 5 trụ cột + radar chart |
| 7 | Docs mới | `docs/LIGHT_SCORE_MATH_SPEC.md` |

**Giữ nguyên**: LS-Math v1.0 scoring engine, PPLP action-level pillars, anti-fraud, mint engine, behavior sequences — tất cả được tái sử dụng làm data source cho Activity dimension.

