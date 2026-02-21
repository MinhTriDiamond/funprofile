
# Plan: Import Chat + Video Call Module

## Tong quan

File `CHAT_CALL_FULL_SOURCE.md` chua toan bo source code chat nang cao + goi dien video/voice qua Agora. Hien tai project chi co chat co ban (nhan tin, reply, reaction, group). Cha se import toan bo module nay, nang cap tu chat don gian len he thong day du voi:

- Goi dien thoai / Video call (Agora WebRTC)
- Chan nguoi dung / Bao cao (Block & Report)
- Ghim tin nhan (Pin messages)
- Sua / Xoa tin nhan (Edit / Soft delete)
- Sticker picker
- Li xi dien tu (Red Envelope)
- Tang crypto trong chat (Send Crypto Modal nang cap)
- Angel AI inline bot trong chat
- Cai dat cuoc goi truoc khi goi (PreCall Settings)
- Tim kiem tin nhan nang cao (voi bo loc nguoi gui)
- Thong bao cuoc goi den tu moi man hinh (Global CallContext)

---

## Phan 1: Database Migrations

Tao cac bang va function chua co trong DB hien tai:

### Bang moi
- `call_sessions` - Luu tru lich su cuoc goi (voice/video)
- `call_participants` - Nguoi tham gia cuoc goi
- `user_blocks` - Chan nguoi dung
- `reports` - Bao cao vi pham
- `sticker_packs` + `stickers` - He thong sticker
- `red_envelopes` + `red_envelope_claims` - Li xi dien tu
- `crypto_gifts` - Tang crypto (neu chua co)
- `live_messages` + `live_reactions` - Chat/reaction trong live stream

### Cot moi tren bang `messages`
- `pinned_at`, `pinned_by` - Ghim tin nhan
- `edited_at` - Thoi gian sua tin nhan
- `message_type` - Loai tin nhan (text, sticker, red_envelope, system)
- `metadata` - Du lieu phu (JSON)

### Function moi
- `pin_message()` / `unpin_message()` - Ghim/bo ghim tin nhan
- `has_block_between()` - Kiem tra chan giua 2 user
- `claim_red_envelope()` - Nhan li xi

### RLS Policies
- RLS cho tat ca bang moi
- Cap nhat RLS messages INSERT de chan user bi block gui tin nhan

### Realtime
- Enable realtime cho `call_sessions`, `call_participants`, `live_messages`, `live_reactions`

---

## Phan 2: Cai dat Package

- Them `agora-rtc-sdk-ng` - Agora Video/Voice SDK

---

## Phan 3: Edge Functions

### Moi
- `supabase/functions/agora-token/index.ts` - Proxy tao Agora token qua Cloudflare Worker
- `supabase/functions/angel-inline/index.ts` - Angel AI bot tra loi trong chat

### Cap nhat
- `supabase/config.toml` - Them config cho 2 function moi

### Secrets can thiet
- `VITE_AGORA_WORKER_URL` - URL cua Cloudflare Worker tao Agora token
- `VITE_AGORA_WORKER_API_KEY` - API key cua Worker
- `ANGEL_BOT_USER_ID` - User ID cua bot Angel trong he thong

---

## Phan 4: Frontend - Module Chat moi

### Cau truc module `src/modules/chat/`

```text
src/modules/chat/
  types/index.ts          -- Type definitions chung
  index.ts                -- Barrel exports
  pages/Chat.tsx           -- Trang chat chinh (thay the src/pages/Chat.tsx)
  hooks/
    useAgoraCall.ts        -- Logic goi dien Agora
    useAngelInline.ts      -- Goi Angel AI bot
    useBlocks.ts           -- Chan/bo chan user
    useChatNotifications.ts
    useChatSettings.ts
    useConversations.ts    -- Nang cap tu hook cu
    useGroupConversations.ts
    useMediaDevices.ts     -- Quan ly camera/mic
    useMessages.ts         -- Nang cap (edit, delete, pin, sticker)
    usePins.ts             -- Ghim tin nhan
    useRedEnvelope.ts      -- Li xi
    useReports.ts          -- Bao cao
    useStickers.ts         -- Sticker packs
    useTypingIndicator.ts  -- Nang cap
  components/
    BlockUserDialog.tsx
    CallControls.tsx       -- Nut dieu khien cuoc goi
    CallRoom.tsx           -- Man hinh cuoc goi
    ChatInput.tsx          -- Nang cap (attach menu, sticker, red envelope, crypto)
    ChatSettingsDialog.tsx
    ConversationList.tsx   -- Nang cap (i18n, search, scroll restore)
    CreateGroupDialog.tsx
    CryptoGiftButton.tsx
    EditMessageDialog.tsx  -- Moi: Sua tin nhan
    GroupSettingsDialog.tsx
    IncomingCallDialog.tsx -- Moi: Thong bao cuoc goi den
    MessageBubble.tsx      -- Nang cap (pin, edit, delete, report, sticker, red envelope)
    MessageSearch.tsx      -- Nang cap (bo loc nguoi gui)
    MessageThread.tsx      -- Nang cap (call buttons, pin banner, block, scroll optimization)
    NewConversationDialog.tsx
    PreCallSettings.tsx    -- Moi: Cai dat truoc cuoc goi
    RedEnvelopeCard.tsx    -- Moi: Hien thi li xi
    RedEnvelopeClaimDialog.tsx
    RedEnvelopeDialog.tsx
    ReportDialog.tsx       -- Moi: Bao cao vi pham
    SendCryptoModal.tsx    -- Moi: Tang crypto
    StickerPicker.tsx      -- Moi: Chon sticker
    TypingIndicator.tsx
    VideoGrid.tsx          -- Moi: Hien thi video call
```

### File moi khac
- `src/contexts/CallContext.tsx` - Global call listener (nhan cuoc goi tu moi trang)
- `src/lib/agoraRtc.ts` - Helper tao Agora client + lay token
- `src/lib/urlFix.ts` - Sua URL chat attachment
- `src/integrations/funChatCallAdapter.ts` - Adapter pattern cho chat+call
- `src/integrations/funChatCallRenderers.tsx` - Renderer components

### File thay doi
- `src/App.tsx` - Wrap `CallProvider`, doi import Chat tu module moi
- `src/pages/Chat.tsx` - Redirect sang module moi hoac xoa, dung module

### File xoa (thay the boi module)
- `src/components/chat/*` (10 files) - Thay bang `src/modules/chat/components/*`
- `src/hooks/useMessages.ts` - Thay bang module version
- `src/hooks/useConversations.ts` - Thay bang module version
- `src/hooks/useTypingIndicator.ts` - Thay bang module version
- `src/hooks/useGroupConversations.ts` - Thay bang module version
- `src/hooks/useChatNotifications.ts` - Thay bang module version
- `src/hooks/useChatSettings.ts` - Thay bang module version

---

## Phan 5: Worker (Chi ghi nhan)

File `worker/` trong bundle la Cloudflare Worker rieng (deploy tren Cloudflare, khong phai Edge Function). Con can tu deploy worker nay tren Cloudflare Workers cua con. Cha se tao edge function `agora-token` lam proxy, nhung Worker thuc te can deploy rieng.

---

## Thu tu thuc hien

1. Chay database migrations (tao bang, cot, function, RLS, indexes)
2. Cai dat `agora-rtc-sdk-ng`
3. Tao `src/modules/chat/types/index.ts`
4. Tao tat ca hooks trong `src/modules/chat/hooks/`
5. Tao tat ca components trong `src/modules/chat/components/`
6. Tao `src/modules/chat/pages/Chat.tsx` + `index.ts`
7. Tao `src/contexts/CallContext.tsx`, `src/lib/agoraRtc.ts`, `src/lib/urlFix.ts`
8. Tao `src/integrations/funChatCallAdapter.ts` + `funChatCallRenderers.tsx`
9. Tao edge functions `agora-token` + `angel-inline`
10. Cap nhat `src/App.tsx` (wrap CallProvider, doi route import)
11. Xoa cac file cu trong `src/components/chat/` va `src/hooks/` da bi thay the
12. Yeu cau con nhap secrets (Agora Worker URL, API key, Angel Bot User ID)

---

## Luu y quan trong

- Quy trinh nay thay doi rat nhieu file (50+ files). Cha se chia thanh nhieu buoc de dam bao khong bi loi
- Can secrets Agora truoc khi goi dien/video hoat dong. Chat van hoat dong binh thuong khong can Agora
- Cloudflare Worker can deploy rieng (khong phai Edge Function)
- Bundle bao gom ca `mediaUpload.ts` va `imageCompression.ts` nhung project da co san, chi can dam bao tuong thich
