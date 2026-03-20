

## Problem

On mobile, there are **two stacked headers**: a small back-button bar from `Chat.tsx` (line 115-118) and then `MessageThread`'s own full header with avatar/name/call buttons. The back button bar is easy to miss and wastes vertical space. From the screenshot, users see the MessageThread header as the "main" header and don't notice the back button above it.

## Solution

Merge the back button **into** the MessageThread header itself on mobile, eliminating the double-header. This follows Messenger/WhatsApp patterns where the back arrow sits inline with the contact name.

### File: `src/modules/chat/components/MessageThread.tsx`

1. **Add `onBack` optional prop** to `MessageThreadProps`
2. **Render a back arrow button** before the avatar in the header when `onBack` is provided:
   ```
   [← back] [avatar] [name]          [phone] [video] [search] [...]
   ```
3. This keeps all navigation in a single header row

### File: `src/modules/chat/pages/Chat.tsx`

1. **Remove the separate back-button bar** (lines 114-118 — the `div` with ArrowLeft + "Tin nhắn")
2. **Pass `onBack={handleBack}` prop** to `<MessageThread>` in the mobile view
3. Desktop view remains unchanged (no `onBack` prop → no back button in MessageThread header)

### Result
- Single header on mobile with back arrow + avatar + name + action buttons
- Saves ~48px vertical space
- Back button is prominent and follows standard messaging app UX
- Desktop sidebar layout unchanged
- No state loss when navigating back (React Query cache preserved)

