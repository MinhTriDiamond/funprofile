

# Sửa lại "Tổng nhận" trong RewardBreakdownModal

## Vấn đề

Hàm `get_member_reward_breakdown` hiện tại tính **Tổng nhận** = `pending_reward + approved_reward + SUM(reward_claims)`. Điều này sai vì `pending_reward` và `approved_reward` hầu hết đã = 0 (sau khi claim xong bị reset), dẫn đến **Tổng nhận ≈ Đã claim**, không phản ánh đúng tổng thưởng từ hoạt động.

Ví dụ thực tế:
- `hongthienhanh68`: Tổng nhận hiện hiển thị = **2.000.000** (sai) — thực tế `total_rewards` trong profiles = **12.320.000**
- `angel_vinhnguyen`: Tổng nhận = **1.999.999** (sai) — thực tế = **2.644.000**

## Giải pháp

Cập nhật hàm RPC `get_member_reward_breakdown` để sử dụng `profiles.total_rewards` làm nguồn dữ liệu cho "Tổng nhận":

```sql
-- Thay đổi công thức:
total_earned = profiles.total_rewards  -- (tổng thưởng từ hoạt động, đã được lưu sẵn)
total_claimed = SUM(reward_claims.amount)
remaining = total_rewards - total_claimed  -- (CAMLY chưa claim)
```

Trường `total_rewards` trong bảng `profiles` chính là tổng CAMLY mà user kiếm được từ tương tác (posts, reactions, comments, shares, friends, livestreams) — khớp với memory `moderation/user-directory`.

### Thay đổi: 1 migration SQL duy nhất

Tạo migration cập nhật hàm `get_member_reward_breakdown()` với logic mới. Không cần thay đổi frontend vì tên cột trả về giữ nguyên.

