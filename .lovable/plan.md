

# Tổng Phần Thưởng: Modal chi tiết + Kiểm tra công thức

## Phân tích hiện tại

Công thức `total_rewards` trong `get_app_stats()` hiện tại:
```sql
SUM(reward_claims.amount)  -- đã claim (bao gồm cả user bị ban) ✅
+ SUM(pending_reward + approved_reward) FROM profiles  -- chưa claim (tất cả user) ✅
```
**→ Công thức đã đúng**, bao gồm cả user bị ban. Không cần sửa.

## Thay đổi

### 1. Tạo hàm RPC: `get_member_reward_breakdown` (migration)

Trả về danh sách tất cả thành viên (kể cả bị ban) với:
- `username`, `avatar_url`, `full_name`, `is_banned`
- `total_earned` = `pending_reward + approved_reward + SUM(reward_claims.amount)`
- `total_claimed` = `SUM(reward_claims.amount)` cho user đó
- `remaining` = `pending_reward + approved_reward`

```sql
CREATE FUNCTION public.get_member_reward_breakdown()
RETURNS TABLE(
  user_id uuid, username text, full_name text, avatar_url text,
  is_banned boolean,
  total_earned numeric, total_claimed numeric, remaining numeric
)
```

### 2. Tạo component `RewardBreakdownModal.tsx`

- Modal mở khi click vào mục "Tổng Phần Thưởng" trên Honor Board
- Bảng: #, User, Họ tên, Tổng nhận, Đã claim, Còn lại
- User bị ban hiển thị badge đỏ
- Footer: tổng cộng 3 cột số (xanh lá đậm)
- Thanh tìm kiếm, style giống `ClaimHistoryModal`
- Click avatar/username → mở profile

### 3. Cập nhật `AppHonorBoard.tsx`

- Thêm state `showRewardBreakdown`
- Click mục "Tổng Phần Thưởng" → mở `RewardBreakdownModal`
- Import và render component mới

