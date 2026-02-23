
# Thông Báo Cảnh Báo Gian Lận Chi Tiết

## Vấn đề hiện tại

Khi hệ thống phát hiện gian lận (thiết bị dùng chung, email farm, IP cluster...), thông báo gửi đến admin chỉ hiển thị dòng chung chung: "Phát hiện thiết bị dùng chung nhiều tài khoản" mà không có thông tin cụ thể (ai, bao nhiêu tài khoản, IP nào...).

Nguyên nhân: Bảng `notifications` hiện chỉ có các cột `user_id`, `actor_id`, `type`, `read`, `post_id` -- không có cột nào để lưu dữ liệu chi tiết.

## Giải pháp

### 1. Thêm cột `metadata` (JSONB) vào bảng `notifications`

Cột này lưu thông tin chi tiết kèm theo thông báo, ví dụ:
- Shared device: `{ device_hash: "abc123", user_count: 5, usernames: ["user1", "user2", ...] }`
- Email farm: `{ email_base: "hoangtydo", count: 4, emails: ["hoangtydo@...", ...] }`  
- IP cluster: `{ ip_address: "113.167.28.188", user_count: 6, usernames: ["user1", ...] }`
- Daily fraud: `{ alerts_count: 3, alerts: ["...", "..."] }`

### 2. Cập nhật Edge Functions gửi metadata khi tạo thông báo

Các file cần sửa:
- `supabase/functions/log-login-ip/index.ts` -- Thêm metadata cho `admin_shared_device` và `admin_email_farm`
- `supabase/functions/daily-fraud-scan/index.ts` -- Thêm metadata cho `admin_fraud_daily`

### 3. Cập nhật hiển thị thông báo

- `src/components/layout/notifications/types.ts` -- Thêm trường `metadata` vào interface `NotificationWithDetails`
- `src/services/notificationService.ts` -- Thêm `metadata` vào query fetch notifications
- `src/components/layout/notifications/utils.ts` -- Hàm `getNotificationText` nhận thêm `metadata` và hiển thị chi tiết
- `src/components/layout/notifications/NotificationItem.tsx` -- Truyền metadata vào `getNotificationText`

### 4. Ví dụ nội dung thông báo sau khi sửa

Thay vì:
> "Cảnh báo: Phát hiện thiết bị dùng chung nhiều tài khoản"

Sẽ hiển thị:
> "Cảnh báo: Thiết bị abc123... có 5 tài khoản: user1, user2, user3..."

Thay vì:
> "Cảnh báo: Phát hiện cụm email farm nghi ngờ"

Sẽ hiển thị:
> "Cảnh báo: Cụm email "hoangtydo" có 4 tài khoản: hoangtydo@gmail.com, hoangtydo88@..."

Thay vì:
> "Báo cáo gian lận hàng ngày: Có hoạt động đáng ngờ cần xử lý"

Sẽ hiển thị:
> "Báo cáo gian lận: 3 cảnh báo - Thiết bị abc... có 5 TK, IP 113.167... có 6 TK..."

## Chi tiết kỹ thuật

### Database Migration
```sql
ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT NULL;
```

### Edge Function Changes

**log-login-ip** (admin_shared_device):
```typescript
admins.map((a) => ({
  user_id: a.user_id,
  actor_id: userId,
  type: "admin_shared_device",
  read: false,
  metadata: {
    device_hash: deviceHash.slice(0, 8),
    user_count: allUserIds.length,
    usernames: allUsernames  // truy vấn thêm từ profiles
  }
}))
```

**log-login-ip** (admin_email_farm):
```typescript
metadata: {
  email_base: emailBase,
  count: matchingUsers.length,
  emails: matchedEmails.slice(0, 5)  // giới hạn 5
}
```

**daily-fraud-scan** (admin_fraud_daily):
```typescript
metadata: {
  alerts_count: alerts.length,
  alerts: alerts.slice(0, 5)  // giới hạn 5 dòng
}
```

### Frontend Changes

Hàm `getNotificationText` sẽ kiểm tra `metadata` và xây dựng nội dung chi tiết cho từng loại cảnh báo fraud.
