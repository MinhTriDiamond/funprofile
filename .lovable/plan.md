

# Đồng bộ số liệu "Tổng Đã Tặng" giữa Honor Board và Claim History

## Vấn đề
- **Honor Board** hiển thị `total_camly_claimed` = **98.188.999** (lấy từ `system_config` key `TREASURY_CAMLY_SPENT` — giá trị cũ, cập nhật thủ công)
- **Claim History Modal** hiển thị tổng = **98.238.999** (tính trực tiếp từ `SUM(amount) FROM reward_claims` — chính xác hơn)
- Chênh lệch: **50.000 CAMLY**

## Giải pháp

Cập nhật hàm `get_app_stats()` để lấy `total_camly_claimed` trực tiếp từ bảng `reward_claims` thay vì giá trị tĩnh trong `system_config`. Điều này đảm bảo hai nơi luôn khớp nhau tự động.

### Thay đổi trong `get_app_stats()` (migration SQL)

```sql
-- Thay dòng:
--   SELECT ... INTO v_treasury_spent FROM system_config WHERE key = 'TREASURY_CAMLY_SPENT';
-- Bằng:
--   SELECT COALESCE(SUM(amount), 0) INTO v_treasury_spent FROM reward_claims;
```

- Không cần thay đổi code frontend
- Số liệu sẽ tự động đồng bộ khi có thêm bản ghi mới trong `reward_claims`

