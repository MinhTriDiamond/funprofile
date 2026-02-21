
# Kiem tra tinh trang Chat + Video Call Module

## Van de chinh phat hien

### 1. `src/pages/Chat.tsx` CHUA duoc cap nhat
File nay van dung **phien ban cu**, import tu `@/hooks/useConversations`, `@/components/chat/ConversationList`, v.v. thay vi re-export tu module moi `src/modules/chat/`. Nghia la toan bo module moi da tao nhung **CHUA DUOC SU DUNG**.

**Can lam:** Thay noi dung `src/pages/Chat.tsx` thanh re-export tu module moi:
```typescript
export { default } from '@/modules/chat/pages/Chat';
```

### 2. `CallProvider` CHUA duoc wrap trong `App.tsx`
`src/contexts/CallContext.tsx` da duoc tao nhung `CallProvider` chua duoc them vao `App.tsx`. Nghia la tinh nang nhan cuoc goi den tu moi man hinh **CHUA HOAT DONG**.

**Can lam:** Import `CallProvider` va wrap ben trong `BrowserRouter` trong `App.tsx`.

### 3. File cu van ton tai va dang duoc su dung
Cac file cu van con va dang duoc import boi cac component khac:
- `src/components/chat/*` (ConversationList, MessageThread, GroupSettingsDialog, v.v.)
- `src/hooks/useConversations.ts`, `src/hooks/useMessages.ts`, v.v.
- `src/pages/Profile.tsx` import `useConversations` tu `@/hooks/useConversations`

**Can lam:** Giu file cu de tranh loi import tu Profile.tsx va cac noi khac. Chi doi `src/pages/Chat.tsx`.

---

## Trang thai cac thanh phan

### Da hoan thanh (OK)
- 24/24 components trong `src/modules/chat/components/` - da tao
- 14/14 hooks trong `src/modules/chat/hooks/` - da tao
- `src/modules/chat/pages/Chat.tsx` - da tao
- `src/modules/chat/index.ts` - barrel exports da tao
- `src/modules/chat/types/index.ts` - types da tao
- `src/contexts/CallContext.tsx` - da tao
- `src/lib/agoraRtc.ts` - da tao
- `src/lib/urlFix.ts` - da tao
- Database migrations - da chay (call_sessions, user_blocks, reports, stickers, red_envelopes, v.v.)
- Edge Functions `agora-token` va `angel-inline` - da tao
- Package `agora-rtc-sdk-ng` - da cai

### CHUA hoan thanh (can sua)
1. **`src/pages/Chat.tsx`** - Chua doi sang re-export tu module moi
2. **`src/App.tsx`** - Chua wrap `CallProvider`
3. **Secrets chua cau hinh** - `AGORA_WORKER_URL`, `AGORA_WORKER_API_KEY`, `ANGEL_BOT_USER_ID` chua duoc nhap (can cho video call va AI bot hoat dong)

---

## Ke hoach sua

### Buoc 1: Cap nhat `src/pages/Chat.tsx`
Thay toan bo noi dung thanh 1 dong re-export:
```typescript
export { default } from '@/modules/chat/pages/Chat';
```
Dieu nay se kich hoat toan bo module moi ma khong can doi import trong App.tsx (vi App.tsx da lazy import tu `./pages/Chat`).

### Buoc 2: Wrap `CallProvider` trong `App.tsx`
Them `CallProvider` ben trong `BrowserRouter` de nhan cuoc goi den tu moi trang.

### Buoc 3: Kiem tra va sua loi TypeScript (neu co)
Sau khi doi import, kiem tra xem co loi build nao khong va sua ngay.

### Luu y
- File cu (`src/components/chat/*`, `src/hooks/useConversations.ts`) van giu lai vi `src/pages/Profile.tsx` va co the cac file khac van import tu do.
- Chat co ban (nhan tin, group) se hoat dong ngay sau Buoc 1.
- Video/Voice call can secrets Agora de hoat dong.
- Angel AI bot can secret `ANGEL_BOT_USER_ID`.
