

# Cập nhật "Tổng Phần Thưởng" trên Honor Board

## Phân tích hiện tại

Công thức `total_rewards` trong `get_app_stats()`:
```sql
SUM(reward_claims.amount)  -- đã claim
+ SUM(pending_reward + approved_reward) FROM profiles  -- chưa claim (giá trị lưu tĩnh)
```

**Vấn đề**: `pending_reward` và `approved_reward` trong bảng `profiles` là giá trị tĩnh, không tự động cập nhật theo hoạt động hàng ngày của user. Phần thưởng thực tế được tính động qua `get_user_rewards_v2` (dựa trên posts, reactions, comments, shares, friends, livestreams). Do đó `total_rewards` trên Honor Board có thể không khớp với tổng thực tế.

## Giải pháp

### 1. Cập nhật hàm `get_app_stats()` (migration SQL)

Thay vì dùng `pending_reward + approved_reward` tĩnh, tính `total_rewards` bằng cách:
- **Đã claim**: `SUM(reward_claims.amount)` — tất cả user kể cả bị ban ✅
- **Chưa claim**: Tính động dựa trên hoạt động thực tế (cùng logic `get_user_rewards_v2`) cho tất cả user (kể cả banned), rồi trừ đi phần đã claim

```sql
total_rewards = SUM(dynamically_calculated_total_reward cho mỗi user)
```

Sử dụng cùng công thức reward:
- Trước 15/01/2026: posts×10K, reactions×1K, comments×2K, shares×10K, friends×10K
- Sau 15/01/2026: posts×5K (max 10/ngày), reactions×1K (max 50/ngày), comments×1K (max 50/ngày), shares×1K (max 10/ngày), friends×10K (max 10/ngày), livestreams×20K (max 5/ngày)
- Bonus new user: 50K/user

### 2. Tạo component `RewardBreakdownModal.tsx`

Modal hiển thị khi click vào mục "Tổng Phần Thưởng":
- Bảng danh sách thành viên: #, Avatar, Username, Họ tên, Tổng nhận, Đã claim, Còn lại
- User bị ban hiển thị badge đỏ
- Footer: tổng cộng 3 cột số
- Thanh tìm kiếm, style tương tự `ClaimHistoryModal`

### 3. Tạo hàm RPC `get_member_reward_breakdown()` (migration SQL)

Trả về danh sách tất cả user với:
- `total_earned`: tính động từ hoạt động (cùng logic get_user_rewards_v2, bao gồm cả user bị ban)
- `total_claimed`: `SUM(reward_claims.amount)` cho user đó
- `remaining`: `total_earned - total_claimed`

### 4. Cập nhật `AppHonorBoard.tsx`

- Thêm state `showRewardBreakdown`
- Click mục "Tổng Phần Thưởng" → mở `RewardBreakdownModal`

