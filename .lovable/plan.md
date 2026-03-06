

## Kế hoạch: Thêm kiểm soát ngưỡng tối thiểu/tối đa khi duyệt thưởng

### Thay đổi trong `src/components/admin/RewardApprovalTab.tsx`

**1. Thêm hằng số** (đầu file):
```ts
const MINIMUM_CLAIM = 200000;
const MAX_DAILY_CLAIM = 500000;
```

**2. Thêm hàm kiểm tra đủ điều kiện** — kết hợp cả profile + ngưỡng tối thiểu:
```ts
const isEligibleForApproval = (u: UserWithReward) =>
  isProfileComplete(u) && u.claimable_amount >= MINIMUM_CLAIM;
```

**3. Cập nhật `handleApprove`** (dòng 199-227): Thêm guard check đầu hàm:
```ts
if (user.claimable_amount < MINIMUM_CLAIM) {
  toast.error(`Chưa đủ tối thiểu ${formatNumber(MINIMUM_CLAIM)} CAMLY`);
  return false;
}
```

**4. Cập nhật `handleBatchApprove`** (dòng 231): Thay `isProfileComplete` bằng `isEligibleForApproval`.

**5. Cập nhật `eligibleFilteredUsers`** (dòng 180): Dùng `isEligibleForApproval` thay cho `isProfileComplete`.

**6. Cập nhật "Chọn tất cả"** (dòng 416-426) và checkbox mỗi user (dòng 449-454): Dùng `isEligibleForApproval`.

**7. Thêm badge cảnh báo ngưỡng** bên cạnh số CAMLY (dòng 495-497):
- Dưới 200K → badge đỏ "Chưa đủ 200K"
- Trên 500K → badge vàng "Vượt 500K/ngày"

**8. Cập nhật nút "Duyệt"** (dòng 517-525): Disabled khi `claimable_amount < MINIMUM_CLAIM`, tooltip hiện "Chưa đủ tối thiểu 200.000 CAMLY".

**9. Cập nhật bộ đếm "Sẵn sàng duyệt"** (dòng 285): Dùng `isEligibleForApproval` thay vì `isProfileComplete`.

Tổng cộng sửa **1 file**, không thay đổi backend. Logic edge function giữ nguyên.

