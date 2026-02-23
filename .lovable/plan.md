
# Backfill Metadata Cho Thông Báo Cảnh Báo Cũ

## Vấn đề

Code frontend và edge functions **đã hoạt động đúng** -- thông báo mới sẽ có metadata chi tiết. Tuy nhiên, các thông báo cũ (đã tạo trước khi thêm cột `metadata`) đang hiển thị text chung chung vì `metadata = null`.

Trong screenshot, ta thấy: *"Cảnh báo: Phát hiện thiết bị dùng chung nhiều tài khoản"* -- đây là fallback text khi không có metadata.

## Giải pháp

Chạy một migration SQL để backfill metadata cho tất cả thông báo admin cũ, dựa trên dữ liệu từ bảng `pplp_fraud_signals`:

### Bước 1: Backfill `admin_shared_device` notifications

Ghép thông báo cũ với fraud signals cùng `actor_id` và thời gian gần nhau, lấy `device_hash` + `user_count` + truy vấn `usernames` từ bảng `profiles`.

### Bước 2: Backfill `admin_fraud_daily` notifications

Với các thông báo fraud daily cũ không có fraud signal tương ứng, set metadata mặc định để hiển thị tốt hơn.

### Bước 3: Backfill `admin_email_farm` notifications (nếu có)

Tương tự, lấy `email_base` và `count` từ fraud signals.

## Chi tiết kỹ thuật

### Database Migration

```sql
-- Backfill admin_shared_device: lấy metadata từ pplp_fraud_signals
UPDATE notifications n
SET metadata = jsonb_build_object(
  'device_hash', fs.details->>'device_hash',
  'user_count', jsonb_array_length(fs.details->'all_user_ids'),
  'usernames', (
    SELECT jsonb_agg(p.username)
    FROM profiles p
    WHERE p.id::text = ANY(
      SELECT jsonb_array_elements_text(fs.details->'all_user_ids')
    )
  )
)
FROM pplp_fraud_signals fs
WHERE n.type = 'admin_shared_device'
  AND n.metadata IS NULL
  AND fs.actor_id = n.actor_id
  AND fs.signal_type = 'SHARED_DEVICE'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - fs.created_at))) < 120;

-- Backfill admin_email_farm
UPDATE notifications n
SET metadata = jsonb_build_object(
  'email_base', fs.details->>'email_base',
  'count', (fs.details->>'count')::int,
  'emails', fs.details->'emails'
)
FROM pplp_fraud_signals fs
WHERE n.type = 'admin_email_farm'
  AND n.metadata IS NULL
  AND fs.actor_id = n.actor_id
  AND fs.signal_type = 'EMAIL_FARM'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - fs.created_at))) < 120;

-- Backfill admin_blacklisted_ip
UPDATE notifications n
SET metadata = jsonb_build_object(
  'ip_address', fs.details->>'ip_address',
  'reason', fs.details->>'reason',
  'known_usernames', fs.details->'known_usernames'
)
FROM pplp_fraud_signals fs
WHERE n.type = 'admin_blacklisted_ip'
  AND n.metadata IS NULL
  AND fs.actor_id = n.actor_id
  AND fs.signal_type = 'BLACKLISTED_IP_LOGIN'
  AND ABS(EXTRACT(EPOCH FROM (n.created_at - fs.created_at))) < 120;
```

Sau khi chạy migration, tất cả thông báo cảnh báo cũ sẽ hiển thị chi tiết cụ thể (device hash, số tài khoản, tên người dùng...) thay vì text chung chung.
