

# Tổng Kiểm Tra: Các Action Tích Lũy Light Score Trong FUN Profile

## Kết Quả Rà Soát

### A. Tổng quan 7 loại action theo LS-Math-v1.0

| Action Type | Config pplp.ts (BR) | Edge Function (BR) | Tích hợp Frontend | Trạng thái |
|---|---|---|---|---|
| **post** | 50 | **5** | Da tich hop (FacebookCreatePost) | LECH BASE REWARD |
| **comment** | 10 | **1** | Da tich hop (CommentSection) | LECH BASE REWARD |
| **reaction** | 10 | **1** | Da tich hop (ReactionButton) | LECH BASE REWARD |
| **share** | 10 | **1** | **CHUA tich hop** (ShareDialog) | THIEU HOAN TOAN |
| **friend** | 20 | **10** | Da tich hop (FriendRequestButton) | LECH BASE REWARD |
| **livestream** | 200 | **20** | **CHUA tich hop** (LiveStream) | THIEU HOAN TOAN |
| **new_user_bonus** | 500 | **50** | **CHUA tich hop** (Dang ky) | THIEU HOAN TOAN |

---

### B. Cac Van De Phat Hien

#### Van de 1: BASE REWARD lech 10x giua Config va Edge Function (NGHIEM TRONG)

- `src/config/pplp.ts` dinh nghia: post=50, comment=10, reaction=10, share=10, friend=20, livestream=200
- `supabase/functions/pplp-evaluate/index.ts` su dung: post=5, comment=1, reaction=1, share=1, friend=10, livestream=20
- Tat ca deu lech **dung 10 lan**. Day la loi khong dong bo giua tai lieu/config va code thuc thi.

#### Van de 2: 3 Action chua duoc tich hop PPLP tren Frontend

1. **share**: `ShareDialog.tsx` ghi vao bang `shared_posts` nhung **KHONG goi** `evaluateAsync({ action_type: 'share' })`. Nguoi dung chia se bai viet se khong duoc tinh Light Score.

2. **livestream**: Khong tim thay bat ky noi nao goi `evaluateAsync({ action_type: 'livestream' })` trong cac module LiveStream. Nguoi dung phat truc tiep se khong duoc tinh Light Score.

3. **new_user_bonus**: Khong tim thay noi nao goi `evaluateAsync({ action_type: 'new_user_bonus' })` khi nguoi dung dang ky moi. Thuong 500 FUN cho nguoi moi khong duoc kich hoat.

#### Van de 3: Cong thuc LS-Math-v1.0 trong Edge Function

Cong thuc hien tai: `BR x Q x I x K x Ux x M_cons x M_seq x IntegrityPenalty`

Theo tai lieu LS-Math-v1.0 day du, cong thuc nen la:
```
L_raw = 0.4 x B + 0.6 x C (tach Base Action va Content Score)
L = L_raw x M_cons x M_seq x IntegrityPenalty
```

Hien tai Edge Function **NHAN truc tiep** tat ca multiplier vao nhau thay vi tach rieng thanh phan `B` (base action) va `C` (content normalized). Tuy nhien, do chua co he thong Community Rating (5 pillar scorecard), viec ap dung day du la chua kha thi. Cong thuc hien tai la phien ban **don gian hoa hop ly** cho giai doan hien tai.

---

### C. Ke Hoach Dong Bo

#### Buoc 1: Dong bo Base Reward trong Edge Function

Cap nhat `pplp-evaluate/index.ts` de BASE_REWARDS khop voi `pplp.ts`:
- post: 5 -> **50**
- comment: 1 -> **10**
- reaction: 1 -> **10**
- share: 1 -> **10**
- friend: 10 -> **20**
- livestream: 20 -> **200**
- new_user_bonus: 50 -> **500**

#### Buoc 2: Tich hop PPLP cho Share

Them `evaluateAsync({ action_type: 'share', reference_id: post.id })` vao `ShareDialog.tsx` sau khi insert thanh cong vao `shared_posts`.

#### Buoc 3: Tich hop PPLP cho Livestream

Tim diem ket thuc livestream (goi `end_livestream`) va them `evaluateAsync({ action_type: 'livestream', reference_id: livestreamId })`.

#### Buoc 4: Tich hop PPLP cho New User Bonus

Them logic goi `pplp-evaluate` voi `action_type: 'new_user_bonus'` trong flow dang ky thanh cong (Auth callback hoac trang Welcome).

---

### D. Chi Tiet Ky Thuat

**File can sua:**
1. `supabase/functions/pplp-evaluate/index.ts` - Cap nhat BASE_REWARDS (10x)
2. `src/components/feed/ShareDialog.tsx` - Them import va goi usePplpEvaluate
3. Module LiveStream (can xac dinh file chinh xac) - Them PPLP evaluate khi ket thuc live
4. Auth flow - Them PPLP evaluate cho new_user_bonus

**Khong can sua:**
- Cong thuc LS-Math-v1.0 (da dung)
- Cac multiplier M_cons, M_seq, IntegrityPenalty (da dung)
- Epoch-based minting flow (da chuyen xong)
- Hook `usePplpEvaluate` (da san sang cho tat ca action types)

