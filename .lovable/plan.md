

# Cập nhật số liệu trang Danh sách thành viên

## Vấn đề

Các cột số liệu trên trang User Directory (`/users`) hiển thị sai:

1. **Cột "Tổng thưởng"** (`camly_calculated`): Đang tính lại từ số lượng hoạt động (posts x 5000 + comments x 1000 + ...) thay vì dùng giá trị thực tế `profiles.total_rewards`. Ví dụ: `hongthienhanh68` hiển thị 8.384.000 nhưng thực tế là 12.320.000.

2. **Cột "Số dư"**: Hiển thị `pending_reward / approved_reward` (luôn = 0/0) thay vì số dư thực tế (Tổng thưởng - Đã rút).

## Giải pháp

### Bước 1: Cập nhật RPC `get_user_directory_summary`

Thay thế công thức tính `camly_calculated` bằng `profiles.total_rewards`:

**Trước:**
```sql
(50000 + old_posts*5000 + ... + new_livestreams*20000)::bigint AS camly_calculated
```

**Sau:**
```sql
COALESCE(p.total_rewards, 0)::bigint AS camly_calculated
```

Loại bỏ các CTE `old_stats`, `new_daily_posts`, `new_daily_reactions`, `new_daily_comments`, `new_daily_shares`, `new_daily_friends`, `new_daily_livestreams`, `new_stats` vì không còn cần thiết.

### Bước 2: Cập nhật RPC `get_user_directory_totals`

Cột `total_camly_calculated` đã đúng (dùng `SUM(p.total_rewards)`), không cần sửa.

### Bước 3: Cập nhật UI cột "Số dư" (`src/pages/Users.tsx`)

Hiển thị số dư thực tế = `camly_calculated - camly_claimed` thay vì `pending_reward / approved_reward`:

**Trước (dòng 404-408):**
```tsx
<p className="text-amber-500 font-semibold">{fmt(user.pending_reward)}</p>
<p className="text-emerald-500">{fmt(user.approved_reward)}</p>
```

**Sau:**
```tsx
<p className="text-amber-500 font-semibold">
  {fmt(user.camly_calculated - user.camly_claimed)}
</p>
```

### Tác động

- "Tổng thưởng" hiển thị đúng giá trị tích lũy thực tế từ hệ thống
- "Số dư" hiển thị số CAMLY còn lại có thể rút (tổng thưởng - đã rút)
- RPC chạy nhanh hơn vì loại bỏ nhiều CTE phức tạp

