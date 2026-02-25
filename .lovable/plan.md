

# Sửa lỗi: Avatar người nhận không hiển thị khi tặng crypto từ Chat

## Nguyên nhân

Trong file `src/modules/chat/components/ChatInput.tsx` (dòng 331-339), khi mở `UnifiedGiftSendDialog`, prop `presetRecipient` chỉ truyền `id`, `username`, và `walletAddress` — **thiếu `avatarUrl` và `displayName`**:

```tsx
presetRecipient={{
  id: recipientUserId || undefined,
  username: recipientName || undefined,        // ← đang dùng recipientName cho username
  walletAddress: recipientWalletAddress || undefined,
  // THIẾU: avatarUrl, displayName
}}
```

Trong khi đó, `MessageThread` đã truyền đầy đủ `recipientAvatar` và `recipientName` vào `ChatInput`, nhưng `ChatInput` không chuyển tiếp chúng.

## Giải pháp

Sửa duy nhất 1 file: `src/modules/chat/components/ChatInput.tsx` — thêm `avatarUrl` và `displayName` vào `presetRecipient`:

```tsx
presetRecipient={{
  id: recipientUserId || undefined,
  username: recipientName || undefined,
  displayName: recipientName || undefined,
  avatarUrl: recipientAvatar || undefined,
  walletAddress: recipientWalletAddress || undefined,
}}
```

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/modules/chat/components/ChatInput.tsx` | Thêm `avatarUrl` và `displayName` vào `presetRecipient` (dòng 335-339) |

