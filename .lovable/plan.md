
# Fix: Sticker khong gui duoc trong chat

## Nguyen nhan goc

Ham `sendMessage` trong `src/hooks/useMessages.ts` chi chap nhan 3 tham so: `content`, `mediaUrls`, `replyToId`. Khi gui sticker, `handleSendSticker` truyen them `messageType: 'sticker'` va `metadata: { sticker }`, nhung 2 tham so nay **bi bo qua hoan toan** vi khong co trong kieu du lieu cua mutation.

Ket qua: Sticker duoc luu vao database nhu tin nhan text binh thuong voi `message_type = 'text'` (gia tri mac dinh) va `metadata = '{}'` (rong). Khi hien thi, `MessageBubble` kiem tra `message_type === 'sticker'` nhung khong bao gio thoa man dieu kien -> sticker hien thi nhu dong chu "[Sticker]" thay vi hinh anh.

## Ke hoach sua

### Sua file `src/hooks/useMessages.ts`

1. **Mo rong kieu du lieu cua `sendMessage` mutation** (dong 199-207):
   - Them `messageType` (optional string, mac dinh `'text'`)
   - Them `metadata` (optional object, mac dinh `{}`)

2. **Truyen cac gia tri moi vao lenh insert** (dong 211-219):
   - Them `message_type: messageType || 'text'`
   - Them `metadata: metadata || {}`

### Chi tiet thay doi

```text
// Truoc (dong 199-219):
mutationFn: async ({
  content,
  mediaUrls,
  replyToId,
}: {
  content?: string;
  mediaUrls?: string[];
  replyToId?: string;
}) => {
  ...
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: content?.trim() || null,
    media_urls: mediaUrls || [],
    reply_to_id: replyToId || null,
  })

// Sau:
mutationFn: async ({
  content,
  mediaUrls,
  replyToId,
  messageType,
  metadata,
}: {
  content?: string;
  mediaUrls?: string[];
  replyToId?: string;
  messageType?: string;
  metadata?: Record<string, any>;
}) => {
  ...
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: content?.trim() || null,
    media_urls: mediaUrls || [],
    reply_to_id: replyToId || null,
    message_type: messageType || 'text',
    metadata: metadata || {},
  })
```

Ngoai ra can sua them dieu kien kiem tra tin nhan rong: cho phep gui khi co `messageType` khac `'text'` (vi sticker khong can noi dung text):

```text
// Truoc:
if (!content?.trim() && !mediaUrls?.length) throw new Error('Message is empty');

// Sau:
if (!content?.trim() && !mediaUrls?.length && (!messageType || messageType === 'text')) 
  throw new Error('Message is empty');
```

## Tong ket
- Chi sua 1 file: `src/hooks/useMessages.ts`
- Them 2 tham so `messageType` va `metadata` vao mutation
- Cho phep gui tin nhan khong co noi dung text khi messageType khac 'text'
- Khong can sua file nao khac vi `MessageThread.tsx` da truyen dung cac tham so nay
