

## Phân tích hiện trạng

Hệ thống Frontend Detection (polling BSC RPC mỗi 15 giây) đã được triển khai và tích hợp vào App.tsx. Tuy nhiên, có **2 vấn đề** khiến giao dịch từ ví ngoài chưa hiển thị đúng:

### Vấn đề 1: Ví ngoài không tạo notification và chat message
Trong `record-instant-donation/index.ts` (dòng 255-308), logic tạo notification và chat message nằm trong block `if (senderProfile)`. Khi ví ngoài gửi, `senderProfile = null` → **không tạo notification, không tạo chat message**.

### Vấn đề 2: Popup realtime vẫn hoạt động nhưng thiếu thông tin
`DonationReceivedNotification` lắng nghe realtime INSERT trên bảng `donations` → popup vẫn hiện. Nhưng vì không có notification record, chuông thông báo không đổ và không có tin nhắn chat.

## Kế hoạch sửa

### 1. Sửa `record-instant-donation` — tạo notification + chat cho ví ngoài
- Di chuyển logic tạo **notification** ra ngoài block `if (senderProfile)` — khi ví ngoài, dùng `actor_id = null` hoặc `actor_id = recipient_id`
- Di chuyển logic tạo **chat message** — khi ví ngoài, tạo tin nhắn hệ thống trong conversation với chính user (hoặc bỏ qua chat nhưng vẫn tạo notification)
- Đảm bảo `is_external = true` donations vẫn kích hoạt đầy đủ thông báo

### 2. Kiểm tra và đảm bảo realtime hoạt động
- Bảng `donations` đã có realtime enabled (migration `20260207022342`)
- `DonationReceivedNotification` đã subscribe đúng filter `recipient_id=eq.${userId}`
- Không cần thay đổi phía frontend

### Files cần sửa
- **`supabase/functions/record-instant-donation/index.ts`**: Thêm notification cho ví ngoài, cải thiện logic chat message

### Chi tiết kỹ thuật
Trong edge function, thay thế block `if (senderProfile) { ... }` bằng:
- Luôn tạo notification (dùng `actor_id: senderProfile?.id || null`)
- Luôn tạo chat message nếu là ví ngoài: gửi tin nhắn hệ thống "🎁 Ví ngoài (0xABC...DEF) đã tặng bạn X TOKEN" vào conversation riêng hoặc tạo notification-only

