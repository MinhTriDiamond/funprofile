

## Nguyên nhân gốc rễ

Giao dịch từ ví ngoài `0x8e58a56...` tặng angelaivan 10,000 CAMLY (tx: `0x17fa457e...`) **đã được ghi vào bảng donations** nhưng:
- **Không có gift_celebration post** (đã xác nhận: 0 kết quả)
- **Không có notification** cho giao dịch này
- **Không có chat message**

**Nguyên nhân**: Trong `auto-scan-donations/index.ts` dòng 248:
```
if (!senderId || !recipientId) continue;
```
Ví ngoài có `senderId = null` → **bị skip hoàn toàn** — không tạo post, notification, hay chat.

**Lý do `fast-scan-donations` không chạy**: Không có pg_cron job cho nó (0 logs). Chỉ có `auto-scan-donations` đang chạy mỗi 5 phút.

## Kế hoạch sửa

### 1. Sửa `auto-scan-donations/index.ts` — cho phép external wallets
- Dòng 248: Đổi `if (!senderId || !recipientId) continue;` thành `if (!recipientId) continue;` (chỉ cần recipientId)
- Dòng 259: Đổi `user_id: senderId` thành `user_id: senderId || recipientId` (post cần user_id hợp lệ)
- Thêm logic notification + chat cho external wallet (giống `fast-scan-donations`)

### 2. Tạo pg_cron job cho `fast-scan-donations`
- Tạo database migration thêm cron job gọi `fast-scan-donations` mỗi 1 phút

### 3. Bổ sung post + notification cho giao dịch đã bị bỏ sót
- Kiểm tra donations có `is_external = true` mà thiếu post/notification, tạo bổ sung

### Files cần sửa
- `supabase/functions/auto-scan-donations/index.ts` — fix logic external wallet
- Database migration — tạo pg_cron job cho fast-scan-donations

