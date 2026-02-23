
# Đóng 4 Live Session Đang Bị Treo

## Tổng Quan
Chạy SQL migration để đóng tất cả live session đang có `status = 'live'` nhưng thực tế đã không hoạt động.

## Chi Tiết
Thực hiện một migration SQL đơn giản:

```sql
UPDATE live_sessions
SET status = 'ended',
    ended_at = now(),
    updated_at = now()
WHERE status = 'live';
```

Đồng thời cập nhật metadata của các post liên quan:

```sql
UPDATE posts
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata::jsonb, '{}'::jsonb),
    '{live_status}', '"ended"'
  ),
  '{ended_at}', to_jsonb(now()::text)
)
WHERE id IN (
  SELECT post_id FROM live_sessions
  WHERE status = 'ended' AND post_id IS NOT NULL
  AND ended_at >= now() - interval '1 second'
);
```

Chỉ cần 1 migration SQL, không cần thay đổi code frontend hay Edge Function nào.
