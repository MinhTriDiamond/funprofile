

## Fix: Mobile Chat Input Hidden Behind Bottom Nav

### Problem
When opening a conversation on mobile (`/chat/{conversationId}`), the `MobileBottomNav` renders on top of the `ChatInput` which uses `sticky bottom-0`. The nav covers the input field entirely.

### Solution
Hide the bottom navigation bar when viewing a conversation on mobile. This is the standard UX pattern used by all major chat apps (Messenger, WhatsApp, Telegram) — when you open a conversation, the bottom nav disappears and the chat takes the full screen with its own back button (already implemented).

### Changes

**File: `src/modules/chat/pages/Chat.tsx`** (1 change)
- Remove `<MobileBottomNav />` from the conversation view branch (when `conversationId` is set). Keep it only for the conversation list view.

Current structure (mobile):
```text
<div h-dvh>
  <FacebookNavbar />
  <main>
    {conversationId ? <MessageThread /> : <ConversationList />}
  </main>
  <MobileBottomNav />  ← always rendered, covers chat input
</div>
```

New structure:
```text
<div h-dvh>
  <FacebookNavbar />
  <main>
    {conversationId ? <MessageThread /> : <ConversationList />}
  </main>
  {!conversationId && <MobileBottomNav />}  ← only show on list view
</div>
```

This is a single-line conditional change. The back button in the conversation header already provides navigation back to the list.

