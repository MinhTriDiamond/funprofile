

## Xóa RewardFormulaCard + Áp dụng công thức FUN = CAMLY / 1000

### 1. Xóa RewardFormulaCard.tsx

File `src/components/wallet/RewardFormulaCard.tsx` hiện không được import ở đâu. Xóa file này.

### 2. Cập nhật công thức mint FUN trong pplp-evaluate

**File:** `supabase/functions/pplp-evaluate/index.ts`

Thay đổi `BASE_REWARDS` từ giá trị cũ sang FUN = CAMLY / 1000:

```text
Hành động      CAMLY    FUN (mới)   FUN (cũ)
──────────────────────────────────────────────
Post           5,000    5           100
Comment        1,000    1           20
Reaction       1,000    1           10
Share          1,000    1           50
Friend         10,000   10          20
Livestream     20,000   20          200
New User       50,000   50          500
```

Lưu ý: `mint_amount = floor(lightScore)` với `lightScore = baseReward * quality * impact * integrity * unityMultiplier`. Các multiplier (quality 0.5-3.0, impact 0.5-5.0, integrity 0-1.0, unity 0.5-2.5) vẫn giữ nguyên, nhưng base reward nhỏ hơn nên FUN cuối cùng sẽ hợp lý hơn.

### 3. Điều chỉnh dữ liệu hiện tại

**Dữ liệu hiện tại cần điều chỉnh:**

- 28,055 light_actions có mint_amount tính theo công thức cũ (post avg ~514 FUN thay vì ~5 FUN)
- 576 mint requests trạng thái `pending_sig` với tổng 900,953 FUN (quá cao)

**Giải pháp:** Tạo edge function `recalculate-fun-amounts` để:

1. Cập nhật `mint_amount` của tất cả `light_actions` eligible theo công thức mới:
   - `new_mint_amount = floor(base_reward_new * quality * impact * integrity * unity_multiplier)`
   - Với base_reward_new: post=5, comment=1, reaction=1, share=1, friend=10, livestream=20
2. Cập nhật `amount_display` và `amount_wei` của các `pplp_mint_requests` (pending_sig, signed) bằng cách tính lại tổng từ light_actions đã điều chỉnh
3. Ghi log kết quả

### 4. Cập nhật MIN_MINT_AMOUNT

Vì FUN giờ nhỏ hơn nhiều (post = 5 FUN thay vì 100+), ngưỡng tối thiểu 1,000 FUN sẽ rất khó đạt. Cần giảm xuống phù hợp:

- **Đề xuất:** MIN_MINT_AMOUNT = 10 FUN (tương đương 10,000 CAMLY = 2 posts)
- Cập nhật trong `pplp-mint-fun/index.ts` và `LightScoreDashboard.tsx`

### 5. Chi tiết kỹ thuật

**Files thay đổi:**
1. Xóa `src/components/wallet/RewardFormulaCard.tsx`
2. Sửa `supabase/functions/pplp-evaluate/index.ts` - BASE_REWARDS mới
3. Sửa `supabase/functions/pplp-mint-fun/index.ts` - MIN_MINT_AMOUNT = 10
4. Sửa `src/components/wallet/LightScoreDashboard.tsx` - MIN_MINT_AMOUNT = 10
5. Tạo `supabase/functions/recalculate-fun-amounts/index.ts` - điều chỉnh dữ liệu cũ

**Edge function recalculate sẽ:**
- Chỉ admin mới gọi được
- Cập nhật từng batch 500 records để tránh timeout
- Trả về summary: bao nhiêu light_actions và mint_requests đã điều chỉnh
