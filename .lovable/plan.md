
# Sửa lỗi "Đã rút" cao hơn "Tổng thu" cho tất cả user

## Vấn đề
Như hình con chụp (user Thu Trang): "Đã rút" = 500.000 nhưng "Tổng thu" = 445.000. Nguyên nhân là sau khi cập nhật công thức thưởng từ 15/1, tổng thưởng được tính lại theo công thức mới (thấp hơn), trong khi số đã rút vẫn giữ nguyên từ trước.

## Giải pháp
Thêm 1 dòng logic vào hàm `get_user_honor_stats`: nếu `v_claimed > v_total_reward` thì tự động đẩy `v_total_reward = v_claimed`. Điều này đảm bảo "Tổng thu" luôn >= "Đã rút" cho tất cả user.

## Chi tiết kỹ thuật

### Database Migration
Sửa hàm `get_user_honor_stats`, thêm 1 dòng sau khi tính `v_claimed` (sau dòng 169) và trước `RETURN QUERY` (dòng 171):

```text
-- Ensure total_reward >= claimed (fix for users who claimed before formula change on 15/1)
v_total_reward := GREATEST(v_total_reward, v_claimed);
```

### Tac dong
- 1 database migration: Cập nhật hàm RPC `get_user_honor_stats`
- Không cần sửa code frontend
- Tự động áp dụng cho tất cả user có trường hợp tương tự
