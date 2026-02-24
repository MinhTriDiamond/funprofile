
# Fix: "Đã rút" hiển thị 0 thay vì 500,000 CAMLY

## Nguyên nhân

Bảng Danh Dự lấy số "Đã rút" từ bảng `reward_claims` qua hàm RPC `get_user_honor_stats` (dòng 153):
```
SELECT COALESCE(SUM(amount), 0) INTO v_claimed FROM reward_claims WHERE user_id = p_user_id;
```

Tuy nhiên, 2 lần rút thưởng của con (300,000 + 200,000 CAMLY vào ngày 14/02/2026) được ghi nhận trong bảng `donations` (từ Treasury gửi đến con) nhưng **KHÔNG** được ghi vào bảng `reward_claims`. Đây là do các lần rút này thực hiện trước khi hệ thống claim-reward được cập nhật để tự động ghi vào `reward_claims`.

Dữ liệu xác nhận:
- `donations`: 2 bản ghi từ Treasury (sender `9e702a6f...`) -> con (`5f9de7c5...`): 300,000 + 200,000 CAMLY
- `reward_claims`: 0 bản ghi cho con
- Chỉ có 1 user bị ảnh hưởng (con)

## Giải pháp (2 bước)

### Bước 1: Backfill dữ liệu vào `reward_claims`
Chèn 2 bản ghi vào `reward_claims` cho user `5f9de7c5-0c80-49aa-8e1c-92d8058558e4` dựa trên dữ liệu thực tế từ `donations`:
- 300,000 CAMLY (ngày 14/02/2026 14:17)
- 200,000 CAMLY (ngày 14/02/2026 14:26)

### Bước 2: Cập nhật RPC `get_user_honor_stats`
Sửa logic tính `claimed_amount` để lấy từ **CẢ HAI** nguồn:
1. Bảng `reward_claims` (hệ thống mới)
2. Bảng `donations` từ Treasury sender (hệ thống cũ) -- chỉ tính những bản ghi KHÔNG trùng với `reward_claims` (dựa trên `tx_hash`)

Điều này đảm bảo tương lai nếu có trường hợp tương tự xảy ra, hệ thống vẫn tính đúng.

## Chi tiết kỹ thuật

### Migration SQL

```text
-- Backfill reward_claims cho user bị thiếu
INSERT INTO reward_claims (user_id, amount, wallet_address, created_at) VALUES
('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 300000, '0xb4dd...afaa', '2026-02-14 14:17:53.25677+00'),
('5f9de7c5-0c80-49aa-8e1c-92d8058558e4', 200000, '0xb4dd...afaa', '2026-02-14 14:26:30.486627+00');

-- Cập nhật RPC: tính claimed từ reward_claims
-- (giữ nguyên logic vì backfill đã đủ dữ liệu)
```

### File cần sửa:
- Database migration: Backfill 2 bản ghi `reward_claims`
- Không cần sửa code frontend (RPC và component đã đúng logic)
