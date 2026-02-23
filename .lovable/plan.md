

# Sửa Dropdown Thông Báo: Thu Gọn Chi Tiết + Avatar Đỏ Cảnh Báo

## Vấn Đề 1: Giao diện cũ vẫn hiển thị
Tính năng thu gọn "Xem chi tiết" chỉ được thêm vào trang `/notifications` (Notifications.tsx), nhưng **dropdown thông báo trên thanh điều hướng** (NotificationDropdown) vẫn sử dụng component `NotificationItem` + hàm `getNotificationText` trong `utils.ts` -- nơi vẫn hiển thị **toàn bộ danh sách dài** (usernames, emails) trực tiếp.

## Vấn Đề 2: Avatar cần đổi thành nút đỏ cảnh báo
Với các thông báo gian lận (admin_shared_device, admin_email_farm, admin_blacklisted_ip, admin_fraud_daily), avatar hiện tại hiển thị ảnh đại diện người dùng bình thường. Cần thay bằng **icon cảnh báo đỏ** để dễ nhận biết.

## Cách Sửa

### File 1: `src/components/layout/notifications/utils.ts`
- Rút gọn nội dung hiển thị mặc định cho các loại fraud:
  - `admin_shared_device`: "Thiết bị xxx... có 3 TK" (bỏ danh sách username dài)
  - `admin_email_farm`: "Cụm email "abc" có 5 TK" (bỏ danh sách email dài)
  - `admin_blacklisted_ip`: "Đăng nhập từ IP bị chặn xxx" (bỏ danh sách liên quan)
  - `admin_fraud_daily`: "7 cảnh báo" (bỏ danh sách alerts)

### File 2: `src/components/layout/notifications/NotificationItem.tsx`
- Thêm state `expanded` để quản lý toggle xem chi tiết
- Với thông báo fraud: thêm nút "Xem chi tiết / Thu gọn"
- Khi mở rộng: hiển thị danh sách đầy đủ (usernames, emails, alerts) giống như đã làm ở Notifications.tsx
- **Đổi Avatar**: Với các thông báo fraud, thay avatar người dùng bằng vòng tròn đỏ có icon Shield (khiên cảnh báo), tạo hiệu ứng nổi bật

### Giao Diện Mới

**Avatar cảnh báo đỏ**: Thay vì ảnh đại diện bình thường, hiển thị nền đỏ gradient + icon Shield trắng + viền đỏ nhấp nháy

**Thu gọn (mặc định)**:
```
[Shield đỏ] Cảnh báo: Thiết bị dfb4ace9... có 3 TK
             [Xem chi tiết v]
             2 giờ trước
```

**Mở rộng (khi bấm)**:
```
[Shield đỏ] Cảnh báo: Thiết bị dfb4ace9... có 3 TK
             [Thu gọn ^]
             - Tài khoản: MINHCANH (email), @Binhan2024 (email)...
             2 giờ trước
```

