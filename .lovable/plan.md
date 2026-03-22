

## Phân tích nguyên nhân: Tại sao angelaivan không nhận thông báo từ ví ngoài

### Vấn đề 1: Frontend Detector bị BSC RPC chặn (quan trọng nhất)
Từ network requests, **100% các lời gọi `eth_getLogs`** đều trả về lỗi `"limit exceeded"`. BSC public RPC rate-limit các request, nên frontend detector không bao giờ phát hiện được transfer nào. Kết quả: `record-instant-donation` chưa bao giờ được gọi (confirmed: 0 logs).

### Vấn đề 2: `fast-scan-donations` không tạo post/notification cho ví ngoài
Hai giao dịch từ ví ngoài `0x8e58a56...` tặng angelaivan (10,000 CAMLY lúc 03:31 và 100,000 CAMLY lúc 03:12) **đã được ghi vào bảng `donations`** nhưng:
- **Không có `gift_celebration` post** (đã kiểm tra: 0 kết quả)
- **Không có notification** cho hai tx này
- Nguyên nhân: trong `fast-scan-donations`, dòng 234 chỉ đưa vào `internalDonations` khi `senderId && recipientId` đều có. Ví ngoài không có `senderId` → không tạo notification/chat. Đồng thời có thể lỗi khi insert post do thiếu `user_id` hợp lệ.

### Vấn đề 3: Auth method lỗi trong `record-instant-donation`
Edge function dùng `getClaims()` - method này có thể không tồn tại trong phiên bản supabase-js hiện tại, gây fail silent.

---

## Kế hoạch sửa

### 1. Sửa `useIncomingTransferDetector` - thêm multiple RPC fallback
- Thêm danh sách 5-6 BSC RPC endpoints thay vì chỉ 1
- Khi bị rate limit, tự động chuyển sang RPC tiếp theo
- Giảm block range xuống 3-5 blocks mỗi lần query
- Tách query: mỗi contract riêng thay vì gộp 3 contract

### 2. Sửa `fast-scan-donations` - tạo post/notification/chat cho ví ngoài
- Tạo notification cho TẤT CẢ donations (không chỉ internal)
- Tạo chat message hệ thống cho external donations (giống logic đã sửa trong `record-instant-donation`)
- Đảm bảo post được tạo đúng với `user_id = recipientId` khi ví ngoài

### 3. Sửa `record-instant-donation` - auth method
- Thay `getClaims()` bằng `getUser()` (method chuẩn của supabase-js)

### Files cần sửa
- `src/hooks/useIncomingTransferDetector.ts` — multiple RPC, fallback, retry
- `supabase/functions/fast-scan-donations/index.ts` — notification/chat cho external
- `supabase/functions/record-instant-donation/index.ts` — fix auth method

