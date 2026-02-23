

# Kích Hoạt Tính Năng "Xác Nhận Đã Đọc" và "Trạng Thái Đang Nhập"

## Tình trạng hiện tại

Cả hai tính năng đều có giao diện cài đặt (toggle bật/tắt) hoạt động tốt, nhưng **cài đặt chưa được áp dụng thực tế** vào luồng chat.

### Xác nhận đã đọc
- Toggle lưu vào database: Hoạt động
- Đánh dấu tin nhắn đã đọc (`markAsRead`): Hoạt động nhưng **không kiểm tra cài đặt** -- luôn đánh dấu bất kể toggle bật hay tắt
- Hiển thị trạng thái đã đọc cho người gửi: **Chưa có** -- không có dấu tích hoặc chữ "Đã xem" hiển thị trên tin nhắn đã gửi

### Trạng thái đang nhập
- Toggle lưu vào database: Hoạt động
- Gửi tín hiệu đang nhập (`sendTyping`): Hoạt động nhưng **không kiểm tra cài đặt** -- luôn gửi bất kể toggle bật hay tắt
- Hiển thị đang nhập của người khác: Hoạt động

## Giải pháp

### 1. Xác nhận đã đọc -- 2 thay đổi

**File `src/modules/chat/components/MessageThread.tsx`:**
- Import `useChatSettings` hook
- Trong `useEffect` đánh dấu đã đọc (dòng 224-243): Kiểm tra `settings?.show_read_receipts` trước khi gọi `markAsRead`. Nếu tắt, không đánh dấu, người gửi sẽ không biết mình đã đọc.

**File `src/modules/chat/components/MessageBubble.tsx`:**
- Thêm prop `showReadReceipt` (boolean) và `readBy` (string[])
- Với tin nhắn do mình gửi (`isOwn`), hiển thị dấu tích ở cuối tin nhắn:
  - Một dấu tích xám: Đã gửi
  - Hai dấu tích xanh: Người nhận đã đọc (khi `readBy` có user khác mình)
- Trong `MessageThread.tsx`, truyền `showReadReceipt` dựa trên cài đặt của mình và dữ liệu `read_by` từ message

### 2. Trạng thái đang nhập -- 1 thay đổi

**File `src/modules/chat/components/MessageThread.tsx`:**
- Sử dụng `useChatSettings` đã import ở trên
- Tạo wrapper cho `sendTyping`: chỉ gọi khi `settings?.show_typing_indicator` bật
- Truyền wrapper này vào `ChatInput` thay vì `sendTyping` gốc

## Chi tiết kỹ thuật

### File 1: `src/modules/chat/components/MessageThread.tsx`

```typescript
// Thêm import
import { useChatSettings } from '../hooks/useChatSettings';

// Trong component, thêm hook
const { settings: chatSettings } = useChatSettings(userId);

// Sửa useEffect markAsRead (dòng 224-243)
useEffect(() => {
  if (!userId || messages.length === 0) return;
  if (chatSettings?.show_read_receipts === false) return; // Không đánh dấu nếu tắt

  // ... phần còn lại giữ nguyên
}, [messages, userId, markAsRead, chatSettings?.show_read_receipts]);

// Tạo wrapper cho sendTyping
const handleTyping = useCallback((isTyping: boolean) => {
  if (chatSettings?.show_typing_indicator === false) return;
  sendTyping(isTyping);
}, [chatSettings?.show_typing_indicator, sendTyping]);

// Trong JSX, thay sendTyping bằng handleTyping
<ChatInput onTyping={handleTyping} ... />
```

### File 2: `src/modules/chat/components/MessageBubble.tsx`

```typescript
// Thêm props
interface MessageBubbleProps {
  // ... existing props
  showReadStatus?: boolean;
}

// Trong JSX, sau thời gian tin nhắn, thêm dấu tích cho tin nhắn của mình
{isOwn && showReadStatus && (
  <span className="text-xs ml-1">
    {message.read_by && message.read_by.length > 1
      ? <CheckCheck className="h-3 w-3 text-blue-500 inline" />
      : <Check className="h-3 w-3 text-muted-foreground inline" />
    }
  </span>
)}
```

### File 3: Truyền prop trong MessageThread

```typescript
// Khi render MessageBubble
<MessageBubble
  // ... existing props
  showReadStatus={chatSettings?.show_read_receipts !== false}
/>
```

## Tổng kết
- Sửa 2 file: `MessageThread.tsx` và `MessageBubble.tsx`
- Xác nhận đã đọc: Kiểm tra cài đặt trước khi đánh dấu + hiển thị dấu tích trên tin nhắn gửi đi
- Trạng thái đang nhập: Kiểm tra cài đặt trước khi phát tín hiệu typing

