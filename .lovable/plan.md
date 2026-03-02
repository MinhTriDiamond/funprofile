

# Dong bo co che Mint FUN Money sang Epoch-Based (Monthly Snapshot)

## Hien trang

Hien tai he thong dang van hanh theo mo hinh **per-action minting**:

```text
User action → pplp-evaluate → light_actions (mint_amount = X FUN) 
            → User click Claim → pplp-mint-fun → pplp_mint_requests
            → Admin sign → On-chain lockWithPPLP
```

**Van de**: Moi action duoc gan `mint_amount` ngay lap tuc (vi du post = 5 FUN x multipliers). User co the claim bat cu luc nao. Dieu nay trai voi LS-Math-v1.0 spec yeu cau:
- Mint theo chu ky (epoch monthly)
- Phan bo ty le: `User Light / Total System Light x Mint Pool`
- Anti-whale cap 3%
- Khong co "post → tien ngay"

## Thiet ke moi

```text
PHASE 1 (Giu nguyen): User action → pplp-evaluate → light_actions (chi luu Light Score, KHONG tinh mint_amount)

PHASE 2 (Moi): Cuoi thang → Edge Function "pplp-epoch-snapshot"
   → Tong hop Light Score cua tat ca user
   → Tinh ty le phan bo
   → Tao mint_allocations cho tung user

PHASE 3 (Cap nhat): User vao Wallet → Thay allocation cua minh
   → Click Claim → pplp-mint-fun (doc tu mint_allocations thay vi light_actions)
   → Admin sign → On-chain
```

## Chi tiet thuc hien

### Buoc 1 — Tao bang `mint_allocations` + Cap nhat `mint_epochs`

```sql
-- Tao bang mint_allocations
CREATE TABLE public.mint_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id UUID REFERENCES mint_epochs(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  light_score_total NUMERIC NOT NULL DEFAULT 0,
  share_percent NUMERIC NOT NULL DEFAULT 0,
  allocation_amount NUMERIC NOT NULL DEFAULT 0,
  allocation_amount_capped NUMERIC NOT NULL DEFAULT 0,
  is_eligible BOOLEAN NOT NULL DEFAULT true,
  reason_codes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending / claimed / minted / expired
  mint_request_id UUID REFERENCES pplp_mint_requests(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(epoch_id, user_id)
);

-- Cap nhat mint_epochs: them cot cho monthly epoch
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS epoch_month TEXT; -- '2026-03'
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS mint_pool NUMERIC DEFAULT 100000;
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS total_light_score NUMERIC DEFAULT 0;
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS eligible_users INTEGER DEFAULT 0;
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'; -- open/snapshot/finalized
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS rules_version TEXT DEFAULT 'LS-Math-v1.0';
ALTER TABLE mint_epochs ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ;
```

RLS:
- User chi doc allocation cua minh
- Admin doc tat ca

### Buoc 2 — Tao Edge Function `pplp-epoch-snapshot`

Edge function nay se:
1. Tinh tong Light Score cua moi user trong thang (tu `light_actions`)
2. Loc user eligible (PPLP accepted, integrity > nguong, light score >= min_light_threshold)
3. Tinh `share = user_light / total_light`
4. Tinh `allocation = share x mint_pool`
5. Ap dung anti-whale cap 3%, tai phan bo phan du
6. Insert vao `mint_allocations`
7. Cap nhat `mint_epochs` status = 'snapshot'

Trigger: Admin goi thu cong hoac cron job dau moi thang.

### Buoc 3 — Cap nhat `pplp-evaluate`

Thay doi quan trong:
- **Bo** viec tinh `mint_amount` per action (set = 0 hoac null)
- **Giu** viec tinh `light_score` (day la diem tich luy cho epoch)
- **Giu** `mint_status = 'approved'` de danh dau action hop le
- **Bo** daily mint cap check (vi khong con mint per-action)

Cu the: `mint_amount` se duoc set = `light_score` (de tracking) nhung user KHONG the claim truc tiep tu light_actions nua. Claim chi qua mint_allocations.

### Buoc 4 — Cap nhat `pplp-mint-fun`

Viet lai de lam viec voi epoch allocations:
- Input: `{ allocation_id }` thay vi `{ action_ids }`
- Doc allocation tu `mint_allocations` (status = 'pending')
- Kiem tra user co phai owner
- Tao `pplp_mint_requests` voi amount tu allocation
- Cap nhat allocation status = 'claimed'

### Buoc 5 — Tao hook `useEpochAllocation`

Hook moi thay the `usePendingActions` cho epoch flow:
- Fetch allocation cua user cho epoch hien tai/truoc
- Hien thi: Light Score tong, Share %, Allocation FUN, Status
- Claim function goi `pplp-mint-fun` voi allocation_id

### Buoc 6 — Cap nhat UI `ClaimRewardsCard`

Thay doi giao dien:
- Hien thi epoch info (thang, mint pool, tong light he thong)
- Hien thi Light Score tich luy cua user trong thang
- Hien thi allocation (sau khi snapshot)
- Trang thai: "Dang tich luy" (chua het thang) / "San sang claim" (sau snapshot) / "Da claim"
- Bo hien thi per-action mint_amount

### Buoc 7 — Cap nhat Admin Dashboard

- Them nut "Chup snapshot thang" (goi pplp-epoch-snapshot)
- Hien thi danh sach allocations cho epoch
- Thay the flow hien tai: Admin review allocation thay vi review tung action

## Tinh tuong thich nguoc

- Light actions cu van giu `mint_amount` da co, nhung user chi co the claim qua epoch allocation moi
- `pplp_mint_requests` cu (da submitted/confirmed) khong bi anh huong
- Actions `approved` cu chua claim se duoc gom vao epoch snapshot

## Thu tu thuc hien

1. Migration DB (mint_allocations + cap nhat mint_epochs)
2. Edge Function pplp-epoch-snapshot
3. Cap nhat pplp-evaluate (bo mint_amount per-action)
4. Cap nhat pplp-mint-fun (doc tu allocation)
5. Hook useEpochAllocation
6. Cap nhat ClaimRewardsCard UI
7. Cap nhat Admin PplpMintTab

