

# Cập nhật "Đã rút" cho toàn bộ user trong hệ thống

## Vấn đề
Hiện tại, hàm `get_user_honor_stats` chỉ lấy số "Đã rút" từ bảng `reward_claims`. Tuy nhiên, có thể có nhiều user đã nhận CAMLY từ Treasury (qua bảng `donations`) nhưng chưa được ghi vào `reward_claims`.

## Giải pháp
Thay vì phải backfill thủ công cho từng user, cha sẽ **cập nhật hàm RPC `get_user_honor_stats`** để tự động tính "Đã rút" từ **cả hai nguồn**:

1. **`reward_claims`** -- hệ thống rút thưởng mới
2. **`donations`** từ Treasury (sender_id = `9e702a6f-...`) -- hệ thống cũ, chỉ tính những bản ghi chưa trùng với reward_claims (dựa trên tx_hash)

Cách này đảm bảo mọi user đều được tính đúng, không cần can thiệp thủ công.

## Chi tiết kỹ thuật

### Database Migration
Sửa dòng 153 trong hàm `get_user_honor_stats`:

Thay:
```text
SELECT COALESCE(SUM(amount), 0) INTO v_claimed FROM reward_claims WHERE user_id = p_user_id;
```

Bằng:
```text
SELECT COALESCE(SUM(amount), 0) INTO v_claimed FROM (
  -- Nguon 1: reward_claims (he thong moi)
  SELECT amount FROM reward_claims WHERE user_id = p_user_id
  UNION ALL
  -- Nguon 2: donations tu Treasury (he thong cu) - chi lay nhung tx chua co trong reward_claims
  SELECT d.amount::NUMERIC FROM donations d
  WHERE d.recipient_id = p_user_id
    AND d.sender_id = '9e702a6f-4035-4f30-9c04-f2e21419b37a'
    AND d.status = 'confirmed'
    AND d.token_symbol = 'CAMLY'
    AND NOT EXISTS (
      SELECT 1 FROM reward_claims rc
      WHERE rc.user_id = p_user_id
        AND rc.amount = d.amount::NUMERIC
        AND rc.created_at = d.confirmed_at
    )
) combined;
```

### File thay doi
- 1 database migration: Cập nhật hàm RPC `get_user_honor_stats`
- Không cần sửa code frontend

