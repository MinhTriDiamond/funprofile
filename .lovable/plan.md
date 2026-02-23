

# Kích Hoạt Tính Năng "Ai Có Thể Nhắn Tin Cho Bạn"

## Vấn đề hiện tại
Cài đặt "Ai có thể nhắn tin cho bạn" (Chỉ bạn bè / Mọi người / Không ai) đã có giao diện và lưu vào database, nhưng **không được kiểm tra khi gửi tin nhắn**. Hàm `canSendMessage` đã được viết sẵn nhưng không được gọi ở đâu cả.

## Giải pháp
Thêm kiểm tra `canSendMessage` vào luồng gửi tin nhắn trong `MessageThread.tsx`.

## Chi tiết kỹ thuật

### File cần sửa: `src/modules/chat/components/MessageThread.tsx`

**1. Import hàm `canSendMessage`:**
```typescript
import { canSendMessage } from '../hooks/useChatSettings';
```

**2. Thêm kiểm tra trước khi gửi tin nhắn trong hàm `handleSend` (dòng 244):**

Trước khi gọi `sendMessage.mutateAsync`, kiểm tra quyền gửi tin nhắn:

```typescript
const handleSend = async (content: string, mediaUrls?: string[]) => {
  // Kiểm tra quyền gửi tin nhắn (chỉ cho hội thoại 1-1)
  if (recipientUserId && userId) {
    const allowed = await canSendMessage(userId, recipientUserId);
    if (!allowed) {
      toast.error('Bạn không thể gửi tin nhắn cho người này do cài đặt quyền riêng tư của họ');
      return;
    }
  }
  // ... phần còn lại giữ nguyên
};
```

**3. Áp dụng tương tự cho `handleSendSticker` (dòng 267) và `handleCreateRedEnvelope` (dòng 280):**
Thêm cùng kiểm tra `canSendMessage` trước khi gửi sticker và phong bao lì xì.

### Tổng kết
- Chỉ sửa 1 file: `src/modules/chat/components/MessageThread.tsx`
- Thêm import `canSendMessage`
- Thêm kiểm tra quyền vào 3 hàm gửi: `handleSend`, `handleSendSticker`, `handleCreateRedEnvelope`
- Hiển thị thông báo lỗi rõ ràng khi bị chặn

