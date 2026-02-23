
# Hiển Thị Chi Tiết Cảnh Báo Trong Thông Báo Báo Cáo Gian Lận

## Vấn Đề

Thông báo `admin_fraud_daily` có đầy đủ dữ liệu chi tiết trong metadata (trường `alerts` chứa mảng các cảnh báo cụ thể), nhưng code hiển thị hiện tại chỉ tóm tắt thành "7 cảnh báo, 0 đình chỉ | TK: user1 (email)..." thay vì hiển thị nội dung chi tiết từng cảnh báo.

Ảnh con chụp cho thấy hiển thị mong muốn: **"7 cảnh báo - Thiết bị dfb4ace9... có 3 tài khoản, Cụm email "tacongminh" có 3 tài khoản, Cụm email "congminhyvnh" có 18 tài khoản"**

## Giải Pháp

Cập nhật case `admin_fraud_daily` trong cả 2 file hiển thị để sử dụng trường `alerts` (mảng) thay vì chỉ hiện số liệu tổng.

### Format hiển thị mới:
```
📊 Báo cáo gian lận: 7 cảnh báo - Thiết bị dfb4ace9... có 3 TK: user1 (email1), user2 (email2), Cụm email "tacongminh" có 3 TK: user3 (email3)...
```

## Chi Tiết Kỹ Thuật

### File 1: `src/pages/Notifications.tsx`

Cập nhật case `admin_fraud_daily` trong hàm `getNotificationText`:
- Kiểm tra `m?.alerts` (mảng string)
- Nếu có alerts: hiển thị `"{alerts_count} cảnh báo - {alerts.join(', ')}"`
- Fallback: giữ nguyên logic cũ nếu không có alerts

### File 2: `src/components/layout/notifications/utils.ts`

Cập nhật case `admin_fraud_daily` trong hàm `getNotificationText` tương tự:
- Ưu tiên hiển thị `alerts` array
- Format: `"{alerts_count} cảnh báo - {alert1}, {alert2}, ..."`

### File 3: `src/components/layout/notifications/types.ts`

Thêm trường `alerts` vào interface `NotificationMetadata` (nếu chưa có):
- `alerts?: string[]`
