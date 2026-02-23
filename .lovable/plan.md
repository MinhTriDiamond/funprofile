
# Hiển Thị Tên + Email Rõ Ràng Trên Tất Cả Thông Báo Cảnh Báo

## Vấn Đề

Hiện tại 2 mục thông báo cũ (`admin_fraud_daily`) chỉ hiển thị số liệu tổng ("7 cảnh báo, 33 đình chỉ") mà không kèm theo danh sách tên user và email cụ thể. Mục mới nhất đã hiển thị username nhưng vẫn thiếu email.

## Giải Pháp

### 1. Cập nhật Edge Function `daily-fraud-scan/index.ts`

- Thu thập **email** của tất cả user bị gắn cờ (từ `auth.admin.listUsers` cho email farm, và query thêm cho shared device/IP cluster)
- Lưu thêm trường `flagged_emails` vào metadata (map username -> email)
- Cập nhật alert text để bao gồm cả email, ví dụ:
  - `"Thiết bị dfb4... có 3 TK: MINHCANH (minh@gmail.com), @Binhan2024 (binh@gmail.com)"`

Metadata mới:
```text
{
  alerts_count: 7,
  alerts: ["..."],
  accounts_held: 33,
  flagged_usernames: ["user1", "user2"],
  flagged_emails: {"user1": "email1@gmail.com", "user2": "email2@gmail.com"}  // MỚI
}
```

### 2. Cập nhật hiển thị `Notifications.tsx` (trang thông báo đầy đủ)

- Case `admin_fraud_daily`: hiển thị danh sách `username (email)` thay vì chỉ username
- Case `admin_shared_device`: hiển thị username kèm email
- Case `admin_email_farm`: hiển thị username kèm email  
- Case `admin_blacklisted_ip`: hiển thị username kèm email nếu có

### 3. Cập nhật hiển thị `utils.ts` (dropdown notification)

- Tương tự cập nhật cho tất cả 4 case admin notification

### 4. Dọn dẹp thông báo trùng lặp

- Xóa các thông báo `admin_fraud_daily` cũ (hiện có 8 bản trùng, chỉ giữ 4 bản mới nhất -- 1 cho mỗi admin)
- Chạy lại scan để tạo thông báo mới với đầy đủ thông tin

### Chi tiết kỹ thuật

**`supabase/functions/daily-fraud-scan/index.ts`:**
- Tạo hàm `lookupEmails()` truy vấn `auth.admin.listUsers` để lấy email theo user ID
- Tái sử dụng data email đã có từ bước email farm detection
- Thêm `flagged_emails` (object username -> email) vào metadata notification
- Cập nhật alert strings: `"username (email)"` format

**`src/pages/Notifications.tsx`:**
- Cập nhật hàm `getNotificationText` cho 4 case admin: hiển thị `username (email)` thay vì chỉ username
- Đọc `m.flagged_emails` để map username -> email

**`src/components/layout/notifications/utils.ts`:**
- Cập nhật hàm `getNotificationText` tương tự cho dropdown
- Thêm `flagged_emails` vào `NotificationMetadata` type

**`src/components/layout/notifications/types.ts`:**
- Thêm `flagged_emails?: Record<string, string>` vào interface `NotificationMetadata`
