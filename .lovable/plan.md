

# Cập nhật Bảng Danh Dự: Cộng thưởng PPLP + Sửa "Có thể rút"

## Vấn đề hiện tại
1. **Tổng thu** chưa bao gồm số CAMLY user được thưởng qua hệ thống chấm điểm PPLP (light_actions). Khi user đăng bài, comment, reaction... được Angel AI đánh giá và mint thưởng, số này chưa được cộng vào "Tổng thu".
2. **Có thể rút** hiện chỉ hiển thị thưởng hôm nay, nhưng đúng ra phải là: **Tổng thu - Đã rút**.

## Giải pháp

### 1. Cộng thêm thưởng PPLP vào Tổng thu
Trong hàm `get_user_honor_stats`, thêm truy vấn tổng `mint_amount` từ bảng `light_actions` (những action đã được approved/minted) và cộng vào `v_total_reward`.

### 2. Sửa "Có thể rút" = Tổng thu - Đã rút
Cập nhật frontend (CoverHonorBoard) để hiển thị `claimable = total_reward - claimed` thay vì chỉ dùng `today_reward`.

## Chi tiết kỹ thuật

### Database Migration
Sửa hàm `get_user_honor_stats`:

```text
-- Thêm biến mới
v_pplp_reward NUMERIC;

-- Sau khi tính v_total_reward (dòng 113), thêm:
SELECT COALESCE(SUM(mint_amount), 0) INTO v_pplp_reward
FROM light_actions
WHERE user_id = p_user_id
  AND mint_status IN ('approved', 'minted')
  AND mint_amount > 0;

v_total_reward := v_total_reward + v_pplp_reward;
```

Giữ nguyên dòng `v_total_reward := GREATEST(v_total_reward, v_claimed)`.

### Frontend (CoverHonorBoard.tsx)
Sửa dòng 38:
- **Trước**: `claimable: Math.max(0, Number(honorData?.today_reward) || 0)`
- **Sau**: `claimable: Math.max(0, (Number(honorData?.total_reward) || 0) - (Number(honorData?.claimed_amount) || 0))`

### Tác động
- 1 database migration: Cập nhật hàm RPC `get_user_honor_stats`
- 1 file frontend: `src/components/profile/CoverHonorBoard.tsx` (dòng 38)
- Tự động áp dụng cho tất cả user
