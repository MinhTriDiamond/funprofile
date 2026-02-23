
# Hiển Thị Tên User Trong Thông Báo Cảnh Báo Gian Lận

## Vấn Đề

Hiện tại thông báo `admin_fraud_daily` chỉ hiển thị số liệu chung (ví dụ: "7 cảnh báo") và các alert text ngắn gọn. Không có tên user cụ thể nên admin phải tự tìm kiếm.

## Giải Pháp

### 1. Cập nhật Edge Function `daily-fraud-scan/index.ts`

- Sau khi phát hiện các cụm gian lận, **truy vấn bảng `profiles`** để lấy `username` của tất cả user bị gắn cờ
- Đưa danh sách username vào metadata của thông báo `admin_fraud_daily`
- Cập nhật text alerts để bao gồm username, ví dụ:
  - "Thiết bị dfb4ace9... có 3 tài khoản: user1, user2, user3"
  - "Cụm email tacongminh có 3 tài khoản: tacongminh1, tacongminh2, tacongminh3"

Metadata mới sẽ có thêm trường:
```text
{
  alerts_count: 7,
  alerts: ["Thiết bị dfb4... có 3 TK: user1, user2, user3", ...],
  accounts_held: 33,
  flagged_usernames: ["user1", "user2", "user3", ...]  // <-- MỚI
}
```

### 2. Cập nhật hiển thị trong `Notifications.tsx`

- Case `admin_fraud_daily`: hiển thị thêm danh sách username từ `m.flagged_usernames`
- Case `admin_shared_device`: hiển thị username từ `m.usernames`
- Case `admin_email_farm`: hiển thị username từ `m.usernames`

### 3. Cập nhật hiển thị trong `utils.ts` (dropdown)

- Tương tự, hiển thị danh sách username trong các case admin_fraud_daily

### Chi tiết kỹ thuật

**File `supabase/functions/daily-fraud-scan/index.ts`:**
- Tạo mảng `allFlaggedUserIds` thu thập tất cả user ID bị phát hiện
- Trước khi gửi notification, query `profiles` để lấy username theo IDs
- Đưa username vào text alerts và thêm trường `flagged_usernames` vào metadata
- Cập nhật alert text: thêm `: username1, username2, ...` vào cuối mỗi alert

**File `src/pages/Notifications.tsx`:**
- Case `admin_fraud_daily`: thêm hiển thị `m.flagged_usernames` nếu có
- Case `admin_shared_device` và `admin_email_farm`: đã có `m.usernames` sẵn, thêm hiển thị

**File `src/components/layout/notifications/utils.ts`:**
- Case `admin_fraud_daily`: thêm hiển thị `flagged_usernames` trong detail text
