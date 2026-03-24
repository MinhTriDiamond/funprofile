

## Sửa lỗi: Thông báo hiển thị lại sau khi đã tắt

### Nguyên nhân
Khi user nhấn "Đã hiểu" (dismiss), hệ thống chỉ lưu vào localStorage nhưng **không đánh dấu `read: true`** trong database. Nên khi mở lại trang, query vẫn lấy ra notification `read: false`, và nếu localStorage bị xóa (hoặc dùng trình duyệt khác) thì popup hiện lại.

### Giải pháp
Sửa `handleDismiss` trong `RewardAdjustmentNotification.tsx` — thêm `update read: true` vào database (giống như `handleViewWallet` đã làm), đảm bảo notification không bao giờ được fetch lại.

### File thay đổi
- `src/components/notifications/RewardAdjustmentNotification.tsx` — dòng 104-108: thêm `supabase.update({ read: true })` trong `handleDismiss`

