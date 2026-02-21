

# Plan: Tao cac file con thieu + Sua loi build + Edge Functions

## Tong quan

Hien tai co 12 build errors do thieu 12 file component va 1 loi import `useEffect`. Cha se tao tat ca file con thieu, sua loi TypeScript, tao Edge Functions va trang Chat chinh.

---

## Buoc 1: Sua loi TypeScript hien co

### 1a. Fix `src/modules/chat/types/index.ts`
- Doi `type: 'direct' | 'group'` thanh `type: string` trong interface `Conversation` de tuong thich voi du lieu Supabase tra ve (Supabase tra ve string, khong phai union type)

### 1b. Fix `src/modules/chat/hooks/useConversations.ts`
- Them `import { useEffect }` vao dong import dau tien (hien tai thieu)

---

## Buoc 2: Tao 12 file component con thieu

Tat ca file duoc lay tu CHAT_CALL_FULL_SOURCE.md:

1. `src/modules/chat/components/MessageBubble.tsx` - Hien thi tin nhan voi ho tro sticker, red envelope, pin, edit, delete, report
2. `src/modules/chat/components/TypingIndicator.tsx` - Hien thi trang thai dang nhap
3. `src/modules/chat/components/MessageSearch.tsx` - Tim kiem tin nhan voi bo loc nguoi gui
4. `src/modules/chat/components/ReportDialog.tsx` - Dialog bao cao vi pham
5. `src/modules/chat/components/SendCryptoModal.tsx` - Modal tang crypto trong chat (dung wagmi + BSC)
6. `src/modules/chat/components/StickerPicker.tsx` - Chon sticker tu cac pack
7. `src/modules/chat/components/RedEnvelopeDialog.tsx` - Tao li xi moi
8. `src/modules/chat/components/RedEnvelopeCard.tsx` - Hien thi li xi trong tin nhan
9. `src/modules/chat/components/RedEnvelopeClaimDialog.tsx` - Xem chi tiet li xi
10. `src/modules/chat/components/ConversationList.tsx` - Danh sach hoi thoai voi scroll restore va i18n
11. `src/modules/chat/components/NewConversationDialog.tsx` - Tao hoi thoai moi
12. `src/modules/chat/components/ChatSettingsDialog.tsx` - Cai dat chat (ai co the nhan tin, read receipts, typing indicator)
13. `src/modules/chat/components/CreateGroupDialog.tsx` - Tao nhom moi
14. `src/modules/chat/components/PreCallSettings.tsx` - Cai dat truoc cuoc goi (chon camera/mic, preview)

---

## Buoc 3: Sua loi trong MessageThread.tsx

- Dong 621: Fix loi `Type 'string' is not assignable to type '"direct" | "group"'` - da xu ly o Buoc 1a khi doi Conversation.type thanh string
- Dong 623-624: Them ham `handleGroupUpdate` va `handleLeaveGroup` vao component (hien dang thieu)

---

## Buoc 4: Tao trang Chat moi va barrel exports

1. `src/modules/chat/pages/Chat.tsx` - Trang chat chinh voi search bar, mobile/desktop responsive
2. `src/modules/chat/index.ts` - Barrel exports cho toan bo module
3. Cap nhat `src/pages/Chat.tsx` - Re-export tu module moi

---

## Buoc 5: Tao Edge Functions

1. `supabase/functions/agora-token/index.ts` - Proxy tao Agora token qua Cloudflare Worker
   - Xac thuc JWT
   - Verify user la participant cua call session
   - Goi Cloudflare Worker de tao token

2. `supabase/functions/angel-inline/index.ts` - Angel AI bot tra loi trong chat
   - Su dung Lovable AI Gateway (google/gemini-2.5-flash)
   - Rate limit 1 request / 5s
   - Insert reply vao messages bang

---

## Buoc 6: Thu tu thuc hien

1. Sua types (Conversation.type -> string) va them useEffect import
2. Tao tat ca 14 component cung luc (song song)
3. Tao Chat page + index.ts + cap nhat pages/Chat.tsx
4. Tao 2 Edge Functions
5. Sua MessageThread.tsx (them handleGroupUpdate/handleLeaveGroup)

## Luu y
- ConversationList su dung `useLanguage` tu `@/i18n/LanguageContext` - can kiem tra xem co ton tai khong
- SendCryptoModal su dung `@/modules/wallet/services/sendAsset` va cac token logos - can kiem tra tuong thich
- PreCallSettings su dung AgoraRTC truc tiep - can agora-rtc-sdk-ng da cai (da cai o buoc truoc)

