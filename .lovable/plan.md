
# Sửa lỗi "Đã rút" bị nhân đôi

## Nguyên nhân
Lần cập nhật trước đã thêm logic tính "Đã rút" từ 2 nguồn: `reward_claims` + `donations` từ Treasury. Tuy nhiên, khi user rút thưởng, hệ thống tạo **cả 2 bản ghi** (1 trong `reward_claims` VÀ 1 trong `donations`). Logic loại trùng (NOT EXISTS) so sánh timestamp nhưng timestamp không khớp chính xác, dẫn đến **đếm gấp đôi**.

Ví dụ user Thu Trang:
- `reward_claims`: 500.000 (1 bản ghi)
- `donations` từ Treasury: 500.000 (1 bản ghi -- cùng giao dịch)
- Kết quả sai: 500.000 + 500.000 = 1.000.000

## Giải pháp
Quay lại chỉ dùng **`reward_claims`** để tính "Đã rút". Bảng này đã ghi nhận đầy đủ tất cả các lần rút thưởng. Bảng `donations` chỉ là bản ghi giao dịch on-chain đi kèm, không cần tính thêm.

## Chi tiết kỹ thuật

### Database Migration
Sửa phần tính `v_claimed` trong hàm `get_user_honor_stats` (dòng 142-157):

Thay toàn bộ block UNION ALL bằng:
```text
SELECT COALESCE(SUM(amount), 0) INTO v_claimed
FROM reward_claims WHERE user_id = p_user_id;
```

Giữ nguyên dòng `v_total_reward := GREATEST(v_total_reward, v_claimed)` để đảm bảo "Tổng thu" luôn >= "Đã rút".

### Tac dong
- 1 database migration: Cập nhật hàm RPC `get_user_honor_stats`
- Không cần sửa code frontend
- Tự động áp dụng cho tất cả user -- số liệu sẽ trở về đúng ngay lập tức
