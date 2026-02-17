
# Cap nhat cong thuc thuong CAMLY

## Thay doi cu the

| Hoat dong | Cu | Moi | Ghi chu |
|---|---|---|---|
| Dang bai | 10,000/bai | **5,000/bai** | Max 10 bai/ngay (giu nguyen) |
| Binh luan nhan | 2,000/binh luan | **1,000/binh luan** | Max 50/ngay, >20 ky tu (giu nguyen) |
| Chia se nhan | 10,000/chia se | **1,000/chia se** | Max **10**/ngay (truoc la 5) |
| Cam xuc nhan | 1,000 | Giu nguyen | Max 50/ngay |
| Ket ban | 10,000 | Giu nguyen | Max 10/ngay |
| Livestream | 20,000 | Giu nguyen | Max 5/ngay |

## Gioi han moi moi ngay

- Bai dang: 5,000 x 10 = 50,000
- Cam xuc: 1,000 x 50 = 50,000
- Binh luan: 1,000 x 50 = 50,000
- Chia se: 1,000 x 10 = 10,000
- Ket ban: 10,000 x 10 = 100,000
- Livestream: 20,000 x 5 = 100,000
- **Tong toi da/ngay: 360,000 CAMLY** (truoc la 500,000)

## Chi tiet ky thuat

### 1. Cap nhat `src/hooks/useRewardCalculation.ts`
- Sua `REWARD_CONFIG.DAILY_LIMITS`:
  - `posts.reward`: 10000 -> 5000, `maxDaily`: 100000 -> 50000
  - `comments.reward`: 2000 -> 1000, `maxDaily`: 100000 -> 50000
  - `shares.reward`: 10000 -> 1000, `maxPerDay`: 5 -> 10, `maxDaily`: 50000 -> 10000
- Sua `MAX_DAILY_REWARD`: 500000 -> 360000

### 2. Cap nhat database function `get_user_rewards_v2`
Tao migration moi de sua cong thuc tinh thuong trong SQL:
- Tat ca `* 10000` cua posts -> `* 5000`
- Tat ca `* 2000` cua comments -> `* 1000`
- Tat ca `* 10000` cua shares -> `* 1000`
- Cap shares: `LEAST(COUNT(*), 5)` -> `LEAST(COUNT(*), 10)`

### 3. Cap nhat `src/config/pplp.ts`
- Sua `BASE_REWARDS.post`: 100 -> 50
- Sua `BASE_REWARDS.comment`: 20 -> 10
- Sua `BASE_REWARDS.share`: 50 -> 10
- Sua `DAILY_CAPS.share.maxActions`: 10 -> 10, `maxReward`: 500 -> 100
