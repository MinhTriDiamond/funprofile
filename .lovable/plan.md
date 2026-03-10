

## Phân tích lỗi trong hệ thống Duyệt Thưởng (Claim Reward)

### Vấn đề phát hiện

Từ screenshot, user **huyhuongphat** có **4 lệnh pending** (mỗi lệnh 500.000 CAMLY) và **Ngocphuong** có **2 lệnh pending**. Đây là lỗi nghiêm trọng.

**Nguyên nhân gốc**: Edge Function `claim-reward` có 2 bug bảo mật:

1. **Không kiểm tra pending claims trùng lặp**: Trước khi tạo `pending_claims` mới, hệ thống không kiểm tra xem user đã có lệnh pending nào chưa. User có thể spam nút Claim nhiều lần.

2. **Không trừ pending claims khỏi số dư khả dụng**: Khi tính `claimableAmount = totalReward - claimedAmount`, hệ thống chỉ trừ `reward_claims` (đã hoàn thành), không trừ `pending_claims` đang chờ. Nên user có 500k claimable → submit 4 lệnh 500k = 2 triệu CAMLY chờ duyệt.

3. **Velocity check chỉ đếm reward_claims**: Giới hạn 2 lần/24h chỉ kiểm tra bảng `reward_claims` (completed), không đếm `pending_claims`. Nên trước khi admin duyệt lệnh nào, user có thể submit vô hạn.

### Kế hoạch sửa

#### 1. Sửa Edge Function `claim-reward/index.ts`

Thêm 2 kiểm tra trước khi tạo pending claim:

**a) Kiểm tra pending claims đang tồn tại** (sau bước 7g, trước bước 8):
```typescript
// Check existing pending claims - block if any exist
const { data: existingPending, error: existingError } = await supabaseAdmin
  .from('pending_claims')
  .select('id, amount')
  .eq('user_id', userId)
  .in('status', ['pending', 'processing']);

if (existingPending && existingPending.length > 0) {
  return new Response(JSON.stringify({
    error: 'Pending Exists',
    message: 'Bạn đang có lệnh claim chờ duyệt. Vui lòng đợi Admin xử lý trước khi tạo lệnh mới.',
    existing_claims: existingPending.length,
  }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

**b) Trừ pending claims khỏi claimable** (tại bước 8):
```typescript
// Get pending claims amounts (not yet in reward_claims)
const { data: pendingClaimsData } = await supabaseAdmin
  .from('pending_claims')
  .select('amount')
  .eq('user_id', userId)
  .in('status', ['pending', 'processing']);

const pendingAmount = pendingClaimsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
const claimableAmount = Math.max(0, totalReward - claimedAmount - pendingAmount);
```

**c) Velocity check bao gồm pending claims** (tại bước velocity):
```typescript
// Count pending_claims in last 24h too
const { count: recentPendingCount } = await supabaseAdmin
  .from('pending_claims')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', last24h.toISOString())
  .in('status', ['pending', 'processing', 'completed']);

const totalRecentClaims = (recentClaimCount || 0) + (recentPendingCount || 0);
```

#### 2. Frontend - Disable nút Claim khi có pending

Trong `ClaimRewardsSection.tsx` hoặc `ClaimRewardDialog.tsx`, kiểm tra nếu đang có pending claim → hiển thị trạng thái "Đang chờ duyệt" thay vì cho phép claim lại.

### Tóm tắt

| Bug | Mức độ | Sửa |
|-----|--------|-----|
| Không chặn duplicate pending | Nghiêm trọng | Block nếu đã có pending/processing |
| Không trừ pending khỏi balance | Nghiêm trọng | Trừ pending amount khi tính claimable |
| Velocity chỉ đếm completed | Trung bình | Đếm cả pending_claims |

