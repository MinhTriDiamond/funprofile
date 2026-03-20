

## Sửa header chat bị che khuất trên mobile

### Vấn đề
Từ ảnh chụp: trên mobile khi mở cuộc trò chuyện, **FacebookNavbar vẫn hiển thị** ở trên cùng (hamburger, search, notification, avatar), chiếm khoảng 56px. Bên dưới là header của MessageThread (tên người dùng, nút gọi, tìm kiếm). Hai header cùng hiện khiến:
- Tên người dùng bị cắt, nút hành động bị che
- Lãng phí không gian dọc trên màn hình nhỏ

### Giải pháp
Ẩn `FacebookNavbar` khi đang xem cuộc trò chuyện trên mobile — giống Messenger/WhatsApp. Header của MessageThread (đã có nút back, avatar, tên, nút gọi/video/search) sẽ thay thế hoàn toàn.

### Thay đổi

**File: `src/modules/chat/pages/Chat.tsx`** (dòng 108-130)

1. Chỉ render `<FacebookNavbar />` khi **không** có `conversationId` (đang ở danh sách chat):

```tsx
// Trước:
<div className="h-dvh flex flex-col bg-background/80">
  <FacebookNavbar />
  <main ...>
    {conversationId ? <MessageThread .../> : ...}
  </main>
</div>

// Sau:
<div className="h-dvh flex flex-col bg-background/80">
  {!conversationId && <FacebookNavbar />}
  <main ...>
    {conversationId ? <MessageThread .../> : ...}
  </main>
</div>
```

Chỉ thay đổi **1 dòng** trong 1 file. MessageThread header đã có đầy đủ: back button, avatar, tên (truncate), nút gọi thoại, video, search, settings — sẽ hiển thị toàn bộ khi không còn bị navbar che phía trên.

