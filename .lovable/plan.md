

# Sửa "Tổng nhận" trong bảng Chi tiết Phần thưởng Thành viên

## Vấn đề

1. **Tổng nhận sai**: Hiện tại hàm `get_member_reward_breakdown` tính `total_earned = pending_reward + approved_reward + SUM(reward_claims)` → ra **118.059.999**. Nhưng đúng ra phải dùng cột `total_rewards` trong bảng profiles (= tổng thu từ công thức hoạt động) → **181.262.000**.
2. **Thiếu user**: Hiện tại chỉ hiển thị 161 user (lọc theo `total_earned > 0`), nhưng hệ thống có **654 user** tổng cộng. Cần hiển thị tất cả.

## Giải pháp

### Migration SQL: Cập nhật hàm `get_member_reward_breakdown`

```sql
-- total_earned = profiles.total_rewards (khớp với trang cá nhân)
-- total_claimed = SUM(reward_claims.amount)  
-- remaining = total_rewards - total_claimed
-- Hiển thị TẤT CẢ user, không lọc > 0
```

Thay đổi cụ thể:
- `total_earned` → dùng `p.total_rewards` thay vì `pending_reward + approved_reward + claimed`
- `remaining` → dùng `total_rewards - claimed` thay vì `pending_reward + approved_reward`
- Bỏ điều kiện `WHERE ... > 0` để hiển thị tất cả user

### Không cần sửa frontend
Component `RewardBreakdownModal.tsx` đã xử lý đúng — chỉ cần sửa dữ liệu từ RPC.

