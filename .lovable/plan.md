
# Sửa bộ lọc tab Duyệt thưởng

## Nguyên nhân
- Sau reset `reward_claims`, mọi user đều có `claimable_amount = total_reward` (vì đã rút = 0)
- Bộ lọc hiện tại: `users.filter(u => u.claimable_amount > 0)` → hiển thị tất cả 508 users
- Đúng ra chỉ nên hiển thị user có `reward_status = 'pending'` — tức user đã yêu cầu duyệt

## Thay đổi

### File: `src/components/admin/RewardApprovalTab.tsx`

1. **Thêm `reward_status` vào interface `UserWithReward`** và map dữ liệu từ profile
2. **Sửa bộ lọc `pendingUsers`**: Từ `claimable_amount > 0` → `reward_status === 'pending'`
   - Chỉ hiển thị user đã chủ động yêu cầu duyệt thưởng
   - User có `reward_status = 'approved'` (đã được duyệt, chưa claim) sẽ không xuất hiện — họ tự claim khi sẵn sàng
   - User bị ban cũng không xuất hiện (đã bị lọc bởi RPC `get_user_rewards_v2`)

### Kết quả mong đợi
- Tab duyệt thưởng sẽ trống (0 users) vì tất cả user đang ở trạng thái `approved`
- Khi user bấm "Yêu cầu rút thưởng" → `reward_status` chuyển sang `pending` → hiển thị trong tab để admin duyệt
