

# Mở lại tính năng Claim Rewards + yêu cầu Admin duyệt

## Tình trạng hiện tại

- `ClaimRewardDialog` đang hiện banner **"Hệ thống tạm dừng bảo trì"** (dòng 122-135), chặn hoàn toàn việc claim.
- `ClaimRewardsSection` cho phép claim khi `reward_status` là `pending` hoặc `approved` (cả hai đều `disabled: false`).
- Đã có sẵn RPC `approve_user_reward` và `reject_user_reward` cho Admin.
- Đã có cột `reward_status` trên bảng `profiles` với các giá trị: `pending`, `approved`, `on_hold`, `rejected`, `banned`.

## Thay đổi cần thực hiện

### 1. `ClaimRewardDialog.tsx` — Mở lại form claim
- Xóa maintenance banner (dòng 122-135).
- Thay `renderInputStep` bằng nội dung của `_renderInputStep_DISABLED` (form nhập số lượng thực tế).
- Xóa hàm `_renderInputStep_DISABLED` (không cần nữa).
- **Thêm prop `rewardStatus`** vào dialog. Nếu `rewardStatus !== 'approved'` → hiện thông báo "Chờ Admin duyệt" và disable nút Claim.

### 2. `ClaimRewardsSection.tsx` — Yêu cầu Admin duyệt mới được claim
- Sửa `statusConfig`: đổi `pending` thành `disabled: true` với label "Chờ Admin duyệt".
- Chỉ `approved` mới `disabled: false`.
- Thêm thông báo hướng dẫn khi status = `pending`: "Tài khoản cần được Admin xét duyệt trước khi claim."

### 3. `WalletCenterContainer.tsx` — Truyền `rewardStatus` vào `ClaimRewardDialog`
- Truyền thêm prop `rewardStatus` khi render `ClaimRewardDialog`.

### Tóm tắt
- 3 file sửa: `ClaimRewardDialog.tsx`, `ClaimRewardsSection.tsx`, `WalletCenterContainer.tsx`
- Không cần thay đổi database — infrastructure đã có sẵn.
- User mới sẽ có `reward_status = 'pending'` → không claim được → Admin duyệt → `approved` → claim bình thường.

