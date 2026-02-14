

# Kiểm tra và Chỉnh sửa mục Claim Rewards

## Vấn đề phát hiện

### 1. Thiếu secrets Treasury (QUAN TRONG NHAT)
Hai secret cần thiết cho chức năng Claim chưa được cấu hình:
- **TREASURY_WALLET_ADDRESS** -- chưa có
- **TREASURY_PRIVATE_KEY** -- chưa có

Khi user claim, edge function tới bước 10 (dòng 240-248) sẽ trả lỗi "Hệ thống chưa được cấu hình đầy đủ" vì không tìm thấy 2 secret này.

### 2. Logic reward_status chặn sai
Edge function `claim-reward` (dòng 137) yêu cầu `reward_status === 'approved'` mới cho claim. Tuy nhiên theo thiết kế, cần cho phép claim ở cả trạng thái `pending` (mặc định) và `approved`. Hiện tại user có status `pending` sẽ bị từ chối.

## Kế hoạch chỉnh sửa

### Bước 1: Thêm secrets Treasury
- Yêu cầu con điền **TREASURY_WALLET_ADDRESS** = `0xd0a262453a42059b7a5DBe6164420cbe674c28f1`
- Yêu cầu con điền **TREASURY_PRIVATE_KEY** (private key hex của ví)

### Bước 2: Sửa logic reward_status trong edge function
File: `supabase/functions/claim-reward/index.ts`

**Truoc:**
```typescript
if (profile.reward_status !== 'approved') {
  // block claim
}
```

**Sau:**
```typescript
const blockedStatuses = ['on_hold', 'rejected'];
if (blockedStatuses.includes(profile.reward_status)) {
  // block claim
}
// Allow 'pending' and 'approved' to proceed
```

### Bước 3: Redeploy edge function
Sau khi sửa code va thêm secrets, redeploy `claim-reward` để áp dụng thay đổi.

## Chi tiết kỹ thuật

Thay đổi duy nhất trong code là tại `supabase/functions/claim-reward/index.ts` dòng 137-149: đổi điều kiện từ "chỉ cho approved" sang "chặn on_hold và rejected", cho phép cả pending và approved đều claim được.

