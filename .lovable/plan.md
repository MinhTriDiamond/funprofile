
# Cập Nhật Hiển Thị Email Cho Tất Cả Thông Báo Cảnh Báo

## Vấn Đề

2 thông báo cảnh báo cũ (`admin_shared_device`) không hiển thị email vì chúng được tạo bởi hàm `log-login-ip` -- hàm này chỉ lưu `usernames` mà không lưu `flagged_emails` vào metadata. Ngoài ra, thông báo `admin_email_farm` từ `log-login-ip` cũng thiếu username + email mapping.

## Giải Pháp

### 1. Cập nhật `log-login-ip/index.ts` - Hàm `detectSharedDevice`

Thêm logic tra cứu email cho các user bị gắn cờ thiết bị chung:
- Sử dụng `auth.admin.listUsers()` hoặc query `globalEmailMap` để lấy email
- Thêm trường `flagged_emails` (map username -> email) vào metadata notification `admin_shared_device`

### 2. Cập nhật `log-login-ip/index.ts` - Hàm `detectEmailFarm`

Thêm username mapping và `flagged_emails` vào metadata notification `admin_email_farm`:
- Tra cứu username từ profiles table cho các user khớp email farm
- Thêm `usernames` và `flagged_emails` vào metadata

### 3. Dọn dẹp thông báo cũ thiếu email

Xóa các thông báo `admin_shared_device` cũ không có `flagged_emails`, sau đó chạy lại scan để tạo mới với đầy đủ thông tin.

## Chi Tiết Kỹ Thuật

**File 1: `supabase/functions/log-login-ip/index.ts`**

Hàm `detectSharedDevice` (dòng ~198-215):
- Sau khi lấy `userProfiles`, thêm query `auth.admin.listUsers()` để lấy email
- Build `flaggedEmails` map: `{ username: email }`  
- Thêm `flagged_emails: flaggedEmails` vào metadata notification

Hàm `detectEmailFarm` (dòng ~272-283):
- Sau khi có `matchingUsers` (từ auth), tra cứu profiles để lấy username
- Build `flaggedEmails` map và `usernames` array
- Thêm `usernames` + `flagged_emails` vào metadata notification

**File 2: Dọn dẹp database**
- Xóa các `admin_shared_device` trùng lặp (giữ bản mới nhất cho mỗi device)
- Chạy lại `daily-fraud-scan` để tạo notification mới có đầy đủ thông tin
