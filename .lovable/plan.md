

# Tính năng: Mời bạn bè cùng Live (Viewer Presence + Invite)

## Tổng quan

Thêm 2 tính năng vào khung Live Chat:
1. **Hiển thị danh sách người đang xem** phía trên khung chat (VD: "user1 đang xem, user2 đang xem...")
2. **Host click vào tên viewer** → hiện menu "Mời live cùng" → gửi thông báo mời

---

## Kiến trúc kỹ thuật

### 1. Theo dõi người đang xem (Presence) — Supabase Realtime Presence

Sử dụng **Supabase Realtime Presence** (không cần tạo bảng mới) để theo dõi ai đang xem live:

- Mỗi viewer khi vào trang Live sẽ `track()` presence với `{ userId, username, avatar_url }`
- Khi rời đi, presence tự động bị xóa
- LiveChatPanel lắng nghe sự kiện `sync` để cập nhật danh sách viewer

**Hook mới: `src/modules/live/hooks/useLivePresence.ts`**
- Nhận `sessionId`, lấy user hiện tại từ `supabase.auth`
- Tạo channel `live-presence:{sessionId}`, sử dụng `.track({ userId, username, avatar_url })`
- Lắng nghe `presence.sync` để trả về danh sách `viewers: { userId, username, avatar_url }[]`
- Cleanup: `untrack()` khi unmount

### 2. Hiển thị danh sách viewer trong LiveChatPanel

**Cập nhật: `src/modules/live/components/LiveChatPanel.tsx`**
- Thêm prop `isHost?: boolean` để phân biệt host/audience
- Gọi `useLivePresence(sessionId)` để lấy danh sách viewers
- Hiển thị phía trên khung chat: thanh ngang cuộn ngang với avatar + tên, kèm text "đang xem"
- Nếu `isHost`, click vào tên viewer sẽ hiện Popover/DropdownMenu với tùy chọn "Mời live cùng"

### 3. Gửi lời mời live (Notification)

Khi host click "Mời live cùng":
- Insert vào bảng `notifications` với `type: 'live_invite'`, `metadata: { session_id, live_title }`
- `user_id` = viewer được mời, `actor_id` = host
- Hiển thị toast "Đã gửi lời mời" cho host

**Không cần thay đổi database** — bảng `notifications` đã có sẵn các cột `type`, `metadata`, `actor_id`, `user_id`.

### 4. Tích hợp vào trang Host & Audience

**`LiveHostPage.tsx`**: Truyền `isHost={true}` vào `<LiveChatPanel>`
**`LiveAudiencePage.tsx`**: Truyền `isHost={false}` (mặc định)

---

## Các file cần thay đổi/tạo mới

| File | Thay đổi |
|------|----------|
| `src/modules/live/hooks/useLivePresence.ts` | **Tạo mới** — Hook presence tracking |
| `src/modules/live/components/LiveChatPanel.tsx` | Thêm thanh viewer list, menu mời live cho host |
| `src/modules/live/pages/LiveHostPage.tsx` | Truyền `isHost={true}` cho LiveChatPanel |
| `src/modules/live/pages/LiveAudiencePage.tsx` | Gọi `useLivePresence` để track viewer |

## UI chi tiết

**Thanh viewer phía trên chat:**
```text
┌─────────────────────────────────┐
│ 👁 5 người đang xem             │
│ [🟢 user1] [🟢 user2] [🟢 ...]  │  ← cuộn ngang
├─────────────────────────────────┤
│ Live Chat                       │
│ ...messages...                  │
└─────────────────────────────────┘
```

**Menu khi host click vào viewer:**
```text
┌──────────────────┐
│ 📹 Mời live cùng │
└──────────────────┘
```

Click → gửi notification → toast "Đã gửi lời mời đến {username}"

