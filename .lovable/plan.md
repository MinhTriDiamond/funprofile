

## Giới hạn Claim CAMLY tối đa 500.000/ngày

### Tổng quan
Thêm giới hạn claim tối đa 500.000 CAMLY mỗi ngày cho mỗi người dùng. Phần CAMLY chưa claim hết sẽ được giữ lại và claim tiếp vào ngày hôm sau. Phần thưởng chỉ được nhận sau khi Admin duyệt (logic hiện tại giữ nguyên).

### Thay đổi chi tiết

#### 1. Edge Function `claim-reward/index.ts`
- Thêm hằng số `DAILY_CLAIM_CAP = 500000`
- Trước khi xử lý giao dịch, truy vấn bảng `reward_claims` để tính tổng số CAMLY user đã claim **trong ngày hôm nay** (theo UTC)
- Nếu user đã claim đủ 500.000 trong ngày, trả lỗi thông báo "Bạn đã claim tối đa 500.000 CAMLY hôm nay, vui lòng quay lại ngày mai"
- Nếu số lượng yêu cầu + đã claim hôm nay vượt 500.000, tự động giảm xuống còn phần cho phép
- Trả thêm thông tin `daily_claimed` và `daily_remaining` trong response

#### 2. Component `ClaimRewardDialog.tsx`
- Hiển thị thông tin "Đã claim hôm nay" và "Còn lại hôm nay" trong giao diện
- Giới hạn nút MAX theo số nhỏ hơn giữa `claimableAmount` và `dailyRemaining`
- Thêm thông báo khi user đã claim hết giới hạn ngày

#### 3. Component `WalletCenterContainer.tsx`
- Truyền thêm thông tin `dailyClaimed` vào `ClaimRewardDialog`
- Fetch thêm tổng claim hôm nay từ bảng `reward_claims`

#### 4. Hook `useClaimReward.ts`
- Cập nhật `ClaimResult` interface thêm `daily_claimed` và `daily_remaining`

### Luồng hoạt động

1. User mở Wallet, thấy tổng CAMLY khả dụng (sau Admin duyệt)
2. User bấm Claim, dialog hiển thị:
   - Tổng khả dụng: X CAMLY
   - Đã claim hôm nay: Y / 500.000 CAMLY
   - Còn được claim hôm nay: Z CAMLY
3. User chỉ có thể claim tối đa Z CAMLY
4. Ngày hôm sau, giới hạn reset về 0, user tiếp tục claim

### Chi tiết kỹ thuật

**Query tính daily claimed (trong Edge Function):**
```sql
SELECT COALESCE(SUM(amount), 0) as today_claimed
FROM reward_claims
WHERE user_id = $userId
AND created_at >= CURRENT_DATE
AND created_at < CURRENT_DATE + INTERVAL '1 day'
```

**Validation trong Edge Function:**
```typescript
const DAILY_CLAIM_CAP = 500000;
const dailyRemaining = Math.max(0, DAILY_CLAIM_CAP - todayClaimed);
const effectiveAmount = Math.min(claimAmount, dailyRemaining);
```

Khong cần thay đổi database schema -- bảng `reward_claims` hiện tại đã có `created_at` để filter theo ngày.

