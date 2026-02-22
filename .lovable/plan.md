
# Loc nguoi dung bi cam khoi bang xep hang

## Tinh trang hien tai

- **joni** va **luudung** da duoc ban tu truoc (is_banned = true, reward_status = 'banned'). Khong can ban lai.
- Van de chinh: ham `get_user_rewards_v2` (RPC) **khong loc** nguoi dung bi cam (`is_banned = true`), nen ho van xuat hien tren bang xep hang (Leaderboard va TopRanking).
- Hien tai co 8 nguoi dung bi cam nhung van xuat hien trong top 20 bang xep hang.

## Giai phap

### 1. Cap nhat ham `get_user_rewards_v2` (Database Migration)

Them dieu kien `WHERE p.is_banned = false` vao truy van chinh cua ham RPC. Day la cach xu ly tap trung - chi can sua 1 cho se tu dong ap dung cho:
- Trang Leaderboard (`/leaderboard`)
- Widget TopRanking tren Feed
- Trang Reward Approval (admin)
- Wallet Center
- User Directory

Cu the: them `WHERE p.is_banned = false` vao cac CTE `old_stats`, `new_stats`, `today_stats`, `total_counts` va truy van chinh `FROM profiles p`.

### 2. Kiem tra ham `get_user_rewards` (v1)

Ham cu `get_user_rewards` (v1) cung can them `WHERE p.is_banned = false` de dam bao khong co noi nao hien thi nguoi bi cam.

## Tac dong

- joni va luudung (da bi ban) se bien mat khoi moi bang xep hang
- 6 nguoi dung bi ban khac cung se duoc an khoi bang xep hang
- Nguoi dung binh thuong khong bi anh huong
- Admin van thay duoc nguoi bi ban qua tab Giam sat trong Admin Dashboard

## Ky thuat

Chi can 1 database migration de cap nhat 2 ham RPC. Khong can thay doi code frontend.
