

# Tổng Phần Thưởng: Kiểm tra số liệu & Modal chi tiết thành viên

## Phân tích hiện tại

**Công thức `total_rewards` trong `get_app_stats()`:**
```
total_rewards = SUM(reward_claims.amount) + SUM(profiles.pending_reward + profiles.approved_reward)
```
- `SUM(reward_claims.amount)` = phần đã claim (≈98.238.999)
- `SUM(pending_reward + approved_reward)` = phần chưa claim (đang chờ + đã duyệt)

Công thức này đúng logic: **Tổng phần thưởng = Đã claim + Chưa claim**.

Tuy nhiên, cần tách rõ 3 con số trên Honor Board:
- **Tổng phần thưởng** = tất cả
- **Đã claim** = `total_camly_claimed` (đã có)
- **Còn lại** = `pending_reward + approved_reward` (chưa hiển thị riêng)

## Thay đổi

### 1. Tạo hàm RPC mới: `get_member_reward_breakdown`
Trả về danh sách thành viên với chi tiết:
- `username`, `avatar_url`, `full_name`
- `total_earned` = `pending_reward + approved_reward + SUM(reward_claims.amount)`
- `total_claimed` = `SUM(reward_claims.amount)` cho user đó
- `remaining` = `pending_reward + approved_reward`

```sql
CREATE OR REPLACE FUNCTION public.get_member_reward_breakdown()
RETURNS TABLE(
  user_id uuid, username text, full_name text, avatar_url text,
  total_earned numeric, total_claimed numeric, remaining numeric
)
```

### 2. Tạo component `RewardBreakdownModal`
File mới: `src/components/feed/RewardBreakdownModal.tsx`
- Modal hiển thị bảng danh sách thành viên
- Cột: #, User, Họ tên, Tổng nhận, Đã claim, Còn lại
- Footer: Tổng cộng 3 cột số
- Có thanh tìm kiếm
- Style tương tự `ClaimHistoryModal`

### 3. Cập nhật `AppHonorBoard.tsx`
- Thêm state `showRewardBreakdown`
- Khi click vào mục "Tổng Phần Thưởng" → mở `RewardBreakdownModal`
- Import và render `RewardBreakdownModal`

