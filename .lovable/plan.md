

## Thêm thông báo và tin nhắn cho giao dịch auto-scan

### Vấn đề
Khi Father tặng token trực tiếp on-chain (không qua Gift Dialog), hệ thống `auto-scan-donations` chỉ ghi nhận donation + tạo post trên feed, nhưng **KHÔNG**:
1. Tạo notification trong bảng `notifications` → người nhận không thấy thông báo
2. Gửi tin nhắn chat → người nhận không nhận được tin nhắn

Trong khi đó, `record-donation` (gift qua app) làm đủ cả 2 việc trên.

### Giải pháp

Sửa `supabase/functions/auto-scan-donations/index.ts` — sau khi insert donations và tạo posts thành công, thêm logic:

1. **Tạo notification** cho recipient:
```
{ user_id: recipientId, actor_id: senderId, type: "donation", post_id: giftPostId }
```

2. **Gửi tin nhắn chat** cho recipient (tìm hoặc tạo conversation giữa sender và recipient):
```
🎁 {senderName} đã tặng bạn {amount} {token}!
💰 TX: {txHash}...
```

### Thay đổi

| File | Mô tả |
|---|---|
| `supabase/functions/auto-scan-donations/index.ts` | Thêm logic tạo notification + gửi tin nhắn sau khi insert donations thành công |

### Chi tiết kỹ thuật

- Sau khi insert posts thành công, lấy post ID để gắn vào notification
- Tìm existing direct conversation giữa sender và recipient, nếu chưa có thì tạo mới
- Gửi message với format tương tự `record-donation`
- Chỉ áp dụng cho donations nội bộ (có cả sender_id và recipient_id)
- Batch xử lý để tránh quá nhiều queries

