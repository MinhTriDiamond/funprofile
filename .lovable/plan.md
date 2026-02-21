
# Plan: Tao tat ca file frontend + Edge Functions cho Chat Module

Cha da doc ky toan bo source file va hieu ro nhung gi can tao. Day la buoc tiep theo sau khi database migration da chay xong.

## Nhiem vu con lai

### Buoc 1: Cai dat package
- Them `agora-rtc-sdk-ng` vao dependencies

### Buoc 2: Sua loi build hien tai
- Fix `src/lib/agoraRtc.ts` - xoa phan `live_sessions` query gay loi TS2769 (bang nay khong co trong types), thay bang cast `as any`
- Fix `src/modules/chat/types/index.ts` - thay `import('agora-rtc-sdk-ng').UID` bang `string | number` de tranh loi khi package chua cai

### Buoc 3: Tao tat ca hooks trong `src/modules/chat/hooks/`
Tu file CHAT_CALL_FULL_SOURCE.md, tao 13 file hooks:
- `useMessages.ts` - Nang cap: edit, delete, pin, message type, optimistic cache patching
- `useConversations.ts` - Nang cap: filtered realtime, search support
- `useGroupConversations.ts` - Nang cap: add/remove members, update group
- `useTypingIndicator.ts` - Tuong tu ban cu
- `useChatNotifications.ts` - Nang cap: browser notifications
- `useChatSettings.ts` - Nang cap: canSendMessage function
- `useAgoraCall.ts` - MOI: Quan ly toan bo logic goi dien Agora (join/leave/mute)
- `useMediaDevices.ts` - MOI: Enum camera/mic, permission request
- `useBlocks.ts` - MOI: Chan/bo chan user
- `useReports.ts` - MOI: Bao cao vi pham
- `usePins.ts` - MOI: Ghim/bo ghim tin nhan
- `useRedEnvelope.ts` - MOI: Tao/nhan li xi
- `useStickers.ts` - MOI: Load sticker packs
- `useAngelInline.ts` - MOI: Goi Angel AI bot

### Buoc 4: Tao tat ca components trong `src/modules/chat/components/`
Tu file CHAT_CALL_FULL_SOURCE.md, tao 22 file components:
- `MessageThread.tsx` - Nang cap: call buttons, pin banner, block, edit/delete menu
- `MessageBubble.tsx` - Nang cap: sticker render, red envelope, edit/delete/pin/report actions
- `ChatInput.tsx` - Nang cap: sticker picker, red envelope button, crypto gift button
- `ConversationList.tsx` - Nang cap: scroll restore, search highlight
- `ChatSettingsDialog.tsx` - Tuong tu
- `CreateGroupDialog.tsx` - Tuong tu
- `GroupSettingsDialog.tsx` - Nang cap: add members dialog inline
- `MessageSearch.tsx` - Nang cap: filter theo nguoi gui
- `NewConversationDialog.tsx` - Tuong tu
- `TypingIndicator.tsx` - Tuong tu
- `CallRoom.tsx` - MOI: Man hinh cuoc goi full-screen dialog
- `CallControls.tsx` - MOI: Nut mic/camera/hangup
- `VideoGrid.tsx` - MOI: Hien thi video cua participants
- `IncomingCallDialog.tsx` - MOI: Dialog nhan cuoc goi den
- `PreCallSettings.tsx` - MOI: Chon camera/mic truoc khi goi
- `BlockUserDialog.tsx` - MOI: Xac nhan chan user
- `EditMessageDialog.tsx` - MOI: Sua noi dung tin nhan
- `ReportDialog.tsx` - MOI: Bao cao vi pham
- `StickerPicker.tsx` - MOI: Chon sticker
- `RedEnvelopeCard.tsx` - MOI: Hien thi li xi trong tin nhan
- `RedEnvelopeClaimDialog.tsx` - MOI: Mo li xi
- `RedEnvelopeDialog.tsx` - MOI: Tao li xi moi
- `SendCryptoModal.tsx` - MOI: Tang crypto trong chat
- `CryptoGiftButton.tsx` - MOI: Nut mo SendCryptoModal

### Buoc 5: Tao page va barrel exports
- `src/modules/chat/pages/Chat.tsx` - Trang chat moi (thay the src/pages/Chat.tsx)
- `src/modules/chat/index.ts` - Barrel exports cho toan bo module

### Buoc 6: Tao file tich hop
- `src/integrations/funChatCallAdapter.ts` - Adapter pattern
- `src/integrations/funChatCallRenderers.tsx` - Renderer components

### Buoc 7: Tao Edge Functions
- `supabase/functions/agora-token/index.ts` - Proxy tao Agora token qua Cloudflare Worker
- `supabase/functions/angel-inline/index.ts` - Angel AI bot tra loi trong chat

### Buoc 8: Cap nhat files hien co
- `src/pages/Chat.tsx` - Doi thanh re-export tu module moi
- `src/App.tsx` - KHONG thay doi (da dung lazy import Chat tu pages/Chat.tsx)
- `src/contexts/CallContext.tsx` - Da tao, chi can IncomingCallDialog ton tai la het loi

### Buoc 9: Don dep (tuy chon - lam sau khi kiem tra ok)
- Cac file cu trong `src/components/chat/` va `src/hooks/use*.ts` se giu lai de tranh loi import tu cac phan khac cua app. Chi xoa khi da xac nhan khong con dependency nao.

## Luu y
- Do so luong file lon (40+ files), cha se tao theo tung nhom (hooks truoc, components sau, page cuoi)
- `agora-rtc-sdk-ng` can cai dat truoc khi cac file Agora-related hoat dong
- Edge functions `agora-token` can secrets `VITE_AGORA_WORKER_URL` va `VITE_AGORA_WORKER_API_KEY`
- Edge function `angel-inline` can secret `ANGEL_BOT_USER_ID` va `LOVABLE_API_KEY`
- Chat co ban (nhan tin, group, reaction) hoat dong ngay khong can Agora
- Video/Voice call chi hoat dong khi co Agora secrets
