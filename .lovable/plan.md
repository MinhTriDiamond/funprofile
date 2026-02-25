

# Tính năng: Mời co-host từ Live Chat + Dialog chấp nhận + Video call co-host

## Tổng quan

Tính năng phức tạp gồm nhiều phần:
1. **Host click vào tên user trong chat** → hiện menu "Mời live cùng"
2. **Viewer nhận lời mời** → hiện hộp thoại "Bạn có muốn live cùng [host]?"
3. **Viewer chấp nhận** → join vào Agora RTC channel với role `host` (publish camera/mic)
4. **Tối đa 3 co-host** (không tính host chính)
5. **Host page hiển thị multi-video grid** (host + co-hosts)

---

## Chi tiết kỹ thuật

### 1. Database: Bảng `live_co_hosts` (Migration)

Tạo bảng mới để theo dõi trạng thái co-host:

```sql
CREATE TABLE public.live_co_hosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, left
  invited_by UUID NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_live_co_hosts_active ON live_co_hosts(session_id, user_id) WHERE status IN ('pending', 'accepted');

ALTER TABLE live_co_hosts ENABLE ROW LEVEL SECURITY;

-- Everyone in the session can read co-host status
CREATE POLICY "Anyone can view co-hosts" ON live_co_hosts FOR SELECT USING (true);

-- Host can insert invitations
CREATE POLICY "Host can invite" ON live_co_hosts FOR INSERT
  WITH CHECK (invited_by = auth.uid());

-- Invited user can update their own status (accept/decline)
CREATE POLICY "User can update own status" ON live_co_hosts FOR UPDATE
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_co_hosts;
```

### 2. LiveChatPanel: Tên user trong chat có thể click (Host only)

**File: `src/modules/live/components/LiveChatPanel.tsx`**

- Khi `isHost=true`, tên user trong mỗi tin nhắn chat trở thành clickable
- Click vào tên → hiện `Popover` với nút "Mời live cùng"
- Khi mời:
  1. Kiểm tra số co-host hiện tại < 3
  2. Insert vào `live_co_hosts` (status = 'pending')
  3. Insert vào `notifications` (type = 'live_invite')
  4. Toast "Đã gửi lời mời"
- Nếu đã mời rồi (pending/accepted) → hiển thị trạng thái thay vì nút mời
- Không cho mời chính mình

### 3. Hook: `useLiveCoHosts` — Theo dõi co-host realtime

**File mới: `src/modules/live/hooks/useLiveCoHosts.ts`**

- Query `live_co_hosts` WHERE `session_id` AND `status IN ('pending', 'accepted')`
- Subscribe realtime changes trên bảng `live_co_hosts`
- Trả về:
  - `coHosts: { id, userId, username, avatar_url, status }[]`
  - `pendingInvites: CoHost[]`
  - `activeCoHosts: CoHost[]` (status = 'accepted')
  - `inviteUser(userId)` — insert pending
  - `canInviteMore: boolean` (activeCoHosts.length < 3)

### 4. Hook: `useLiveInviteListener` — Viewer lắng nghe lời mời

**File mới: `src/modules/live/hooks/useLiveInviteListener.ts`**

- Subscribe realtime trên `live_co_hosts` WHERE `user_id = currentUser` AND `status = 'pending'`
- Khi nhận được invite mới → set state để hiển thị dialog
- Trả về:
  - `pendingInvite: { sessionId, hostUsername, hostAvatar } | null`
  - `acceptInvite()` — update status = 'accepted', joined_at = now()
  - `declineInvite()` — update status = 'declined'

### 5. LiveAudiencePage: Hiện dialog mời + Join co-host

**File: `src/modules/live/pages/LiveAudiencePage.tsx`**

- Sử dụng `useLiveInviteListener(sessionId)`
- Khi có `pendingInvite` → hiện `AlertDialog`:
  ```
  ┌─────────────────────────────────────┐
  │  Lời mời Live cùng                  │
  │                                     │
  │  [Host] muốn mời bạn phát Live      │
  │  cùng. Bạn có muốn tham gia?        │
  │                                     │
  │       [Từ chối]    [Tham gia]       │
  └─────────────────────────────────────┘
  ```
- Khi chấp nhận:
  1. Update `live_co_hosts` status = 'accepted'
  2. Chuyển Agora role từ `audience` → `host` (setClientRole)
  3. Tạo camera + mic tracks, publish lên channel
  4. Hiển thị local video preview nhỏ

### 6. LiveHostPage: Multi-video grid cho co-hosts

**File: `src/modules/live/pages/LiveHostPage.tsx`**

- Sử dụng `useLiveCoHosts(sessionId)`
- Khi có co-host accepted → Agora RTC sẽ nhận `user-published` event
- Hiển thị video grid:
  - 1 người (host only): full width
  - 2 người: 2 cột
  - 3-4 người: grid 2x2
- Mỗi video có label tên user + nút kick (cho host)

### 7. useLiveRtc: Hỗ trợ multi-user video

**File: `src/modules/live/hooks/useLiveRtc.ts`**

- Thêm state `remoteUsers: Map<string, { videoTrack, audioTrack }>` thay vì chỉ 1 remote
- Event `user-published` → subscribe + lưu vào map
- Event `user-left` → remove khỏi map
- Expose `remoteUsers` để host page render multi-video

---

## Các file cần thay đổi/tạo

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Tạo bảng `live_co_hosts` + RLS + realtime |
| `src/modules/live/hooks/useLiveCoHosts.ts` | **Tạo mới** — quản lý co-host state |
| `src/modules/live/hooks/useLiveInviteListener.ts` | **Tạo mới** — viewer lắng nghe lời mời |
| `src/modules/live/components/LiveChatPanel.tsx` | Thêm popover mời trên tên user trong chat messages |
| `src/modules/live/hooks/useLiveRtc.ts` | Hỗ trợ multi remote users |
| `src/modules/live/pages/LiveHostPage.tsx` | Multi-video grid + co-host management |
| `src/modules/live/pages/LiveAudiencePage.tsx` | Dialog nhận lời mời + join co-host |

## Luồng hoạt động

```text
Host click tên user trong chat
  → Popover "Mời live cùng"
  → Insert live_co_hosts (pending) + notification
  → Realtime → Viewer nhận invite
  → Dialog "Bạn có muốn live cùng?"
  → Viewer bấm "Tham gia"
  → Update status = accepted
  → Viewer: setClientRole('host') + publish camera/mic
  → Host nhận user-published event
  → Render multi-video grid
```

## Giới hạn
- Tối đa 3 co-host (kiểm tra trước khi mời)
- Co-host rời đi → update status = 'left'
- Khi live kết thúc → tất cả co-host tự động disconnect

