

# Sửa lỗi "Page Unresponsive" — Hàm `get_app_stats()` quá nặng

## Nguyên nhân

Hàm `get_app_stats()` vừa cập nhật để tính `total_rewards` động đang chạy **correlated subqueries** (truy vấn con lồng nhau) cho từng user (~656 profiles):
- `old_stats` CTE: 5 subqueries × 656 users = ~3.280 truy vấn con
- `per_user_reward` CTE: 6 subqueries × 656 users = ~3.936 truy vấn con  
- **Tổng: ~7.200 truy vấn con** → timeout → Page Unresponsive

## Giải pháp

Viết lại hàm `get_app_stats()` sử dụng **JOIN + GROUP BY** thay vì correlated subqueries:

1. Tính `old_stats` bằng LEFT JOIN + GROUP BY trên toàn bộ bảng (1 truy vấn/bảng thay vì 1/user)
2. Tính `new_daily_*` tổng hợp bằng SUM trực tiếp (không cần correlated subquery trong `per_user_reward`)
3. Kết quả: từ ~7.200 truy vấn xuống còn ~12 truy vấn đơn giản

### Thay đổi
- **1 migration SQL**: Tạo lại `get_app_stats()` với logic tối ưu
- **Không thay đổi frontend**

