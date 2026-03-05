

# Chỉnh sửa tính năng Duyệt thưởng

## 3 yêu cầu

1. **Hiển thị thời gian yêu cầu claim** — Hiện tại chỉ hiện `last_claimed_at` (lần claim gần nhất). Cần thêm thời gian user yêu cầu duyệt (từ bảng `reward_approvals` hoặc thời gian `reward_status` chuyển sang `pending`). Vì không có trường riêng, sẽ lấy `updated_at` từ profiles khi `reward_status = pending/approved` làm thời gian yêu cầu.

2. **Avatar/username click → trang cá nhân** — Wrap Avatar và username bằng `<a>` link đến `/${user.username}` (mở tab mới).

3. **Nút duyệt hàng loạt** — Thêm checkbox chọn nhiều user + nút "Duyệt tất cả đã chọn" để approve hàng loạt các user đủ điều kiện.

## Thay đổi — 1 file `RewardApprovalTab.tsx`

### 1. Thêm `reward_status` và `updated_at` vào data fetch
- Mở rộng query profiles: thêm `reward_status, updated_at`
- Map vào interface `UserWithReward` thêm trường `reward_requested_at`

### 2. Avatar + username click → profile
- Wrap `<Avatar>` và username trong `<a href="/${user.username}" target="_blank">` với cursor-pointer và hover effect

### 3. Hiển thị thời gian yêu cầu claim
- Thêm dòng hiển thị `📋 Yêu cầu: dd/mm/yyyy HH:mm` bên cạnh thông tin claim hiện có

### 4. Nút duyệt hàng loạt
- State `selectedIds: Set<string>` để track checkbox
- Checkbox trên mỗi user row (chỉ user đủ điều kiện)
- Checkbox "Chọn tất cả" ở header
- Nút "Duyệt hàng loạt (N)" ở toolbar, gọi `handleApprove` tuần tự cho từng user đã chọn
- Hiện progress toast trong quá trình duyệt

### Tóm tắt
- 1 file sửa: `src/components/admin/RewardApprovalTab.tsx`
- Thêm ~60 dòng code cho batch approve, link profile, và hiển thị thời gian

