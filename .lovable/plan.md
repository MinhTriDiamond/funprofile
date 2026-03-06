

# Kiểm tra số liệu "Tổng Phần Thưởng" = 124.977.999

## Phân tích dữ liệu thực tế

Đã truy vấn database:

| Chỉ số | Giá trị |
|--------|---------|
| `SUM(reward_claims)` (đã claim) | 98.238.999 |
| `SUM(pending_reward + approved_reward)` từ profiles (tĩnh) | 26.739.000 |
| **Tổng hiện tại (tĩnh)** | **124.977.999** |
| Tính động từ `get_user_rewards_v2` (chỉ user chưa ban) | **157.707.000** |
| User bị ban đã claim | 74.931.000 |

## Vấn đề

`total_rewards` đang dùng `pending_reward + approved_reward` từ bảng `profiles` — đây là giá trị **tĩnh**, không cập nhật theo hoạt động hàng ngày. Tổng thực tế phải cao hơn nhiều vì hoạt động mới mỗi ngày không được phản ánh.

## Giải pháp

Cập nhật `get_app_stats()` để tính `total_rewards` **động** bằng cùng công thức `get_user_rewards_v2`, nhưng cho **TẤT CẢ user** (kể cả banned):

```sql
total_rewards = SUM(dynamic_total_reward cho mỗi user, bao gồm banned)
```

Logic tính:
- **Trước 15/01/2026**: posts×10K, reactions×1K, comments×2K, shares×10K, friends×10K
- **Sau 15/01/2026**: posts×5K (max 10/ngày), reactions×1K (max 50/ngày), comments×1K (max 50/ngày), shares×1K (max 10/ngày), friends×10K (max 10/ngày), livestreams×20K (max 5/ngày)  
- **Bonus**: 50K/user

### Thay đổi
1. **Migration SQL**: Tạo lại `get_app_stats()` với logic tính `total_rewards` động, sao chép logic CTEs từ `get_user_rewards_v2` nhưng bỏ filter `is_banned = false`
2. **Không cần thay đổi frontend** — field name giữ nguyên

### Lưu ý hiệu năng
Query sẽ nặng hơn vì phải tính cho ~656 users. Tuy nhiên, frontend đã cache 5 phút (`staleTime: 5 * 60 * 1000`), nên không ảnh hưởng đáng kể.

