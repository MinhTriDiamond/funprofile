

# AUDIT TOÀN DIỆN FUN PROFILE — BÁO CÁO CTO (Vòng 8)

---

## I. TIẾN ĐỘ TỪ VÒNG 7

| Điểm | Trạng thái |
|------|-----------|
| 1. Migrate getSession → useCurrentUser (6 files) | ✅ GiftNavButton, FinancialTab, LawOfLight |
| 2. Acknowledge security findings | ✅ Đã mark |
| 3. Fix liveService.ts `supabase as any` | ⚠️ Vẫn `const db = supabase as any` (dòng 10), TODO comment chưa resolve |
| 4. Type useProfile posts | ✅ ProfilePostItem union type |
| 5. Type UnifiedGiftSendDialog | ⚠️ Vẫn 1.293 dòng, `as any` dòng 666 |
| 6. Type CallContext payload | ✅ CallSessionPayload interface |
| 7. Migrate console.log → logger | ⚠️ 456 matches / 27 files còn lại |
| 8. Document empty catch | ✅ Đa phần đã document |
| 9. Refactor UnifiedGiftSendDialog | ⚠️ GiftRecipientSearch + GiftConfirmStep created nhưng **không ai import** — dead code |
| 10. useState\<any\> | ✅ 0 matches — hoàn toàn sạch |

---

## II. PHÁT HIỆN MỚI VÒNG 8

### 1. Dead Code: `GiftRecipientSearch.tsx` + `GiftConfirmStep.tsx` — chưa tích hợp

Hai file mới tạo ở vòng 7 (`src/components/donations/gift-dialog/GiftRecipientSearch.tsx` và `GiftConfirmStep.tsx`) không được import bởi `UnifiedGiftSendDialog.tsx`. UnifiedGiftSendDialog vẫn 1.293 dòng monolith. Cần tích hợp hoặc xóa dead code.

### 2. `liveService.ts` — `const db = supabase as any` vẫn tồn tại (dòng 10)

TODO comment "Replace with supabaseJsonHelpers when available" — nhưng `supabaseJsonHelpers.ts` đã tồn tại. Cần migrate `db` → sử dụng `toJson()` / `mergeJson()` từ helpers rồi dùng `supabase` trực tiếp thay vì cast toàn bộ.

### 3. `useLiveHeartbeat.ts` — `(supabase as any)` dòng 15

Tương tự liveService, cast toàn bộ client chỉ để `.update()` trên live_sessions. Chỉ cần cast field-level.

### 4. `ProfileHeader.tsx` — 5 instances `(profile as any).field` (dòng 50, 221)

`ProfileData` interface đã có `external_wallet_address`, `custodial_wallet_address`, `wallet_address` nhưng code vẫn cast `as any`. Đây là casts **không cần thiết** vì type đã đúng.

### 5. Realtime payload `as any` — 50 matches / 7 files

Pattern lặp lại: `payload.new as any` trong mọi realtime subscription. Supabase cung cấp generic type `RealtimePostgresChangesPayload<T>` nhưng không dùng. Files ảnh hưởng:
- `useMessages.ts` (5 instances)
- `useAgoraCall.ts` (2 instances)
- `useLiveComments.ts` (1)
- `useLiveReactions.ts` (1)
- `useLiveMessages.ts` (1)
- `useChatNotifications.ts` (2 — cả modules/chat và hooks/)

### 6. `t(key as any)` — i18n type gaps (3 files)

- `CommentReactionButton.tsx`: `t(r.labelKey as any)`
- `ClassicEmailLogin.tsx`: `t(usernameError as any)`
- `ShareDialog.tsx`: `t(opt.labelKey as any)`

Nguyên nhân: `labelKey` là string literal không nằm trong i18n TranslationKeys union. Cần thêm keys hoặc cast đúng cách.

### 7. `ActiveAccountContext.tsx` — `(connector as any).getProvider()` (2 instances)

Wagmi v2 đã có typed `getConnectorClient()` thay vì `.getProvider()`. Tuy nhiên đây là wagmi type gap thực tế — cast có thể chấp nhận nếu document.

### 8. `console.log` — vẫn 456 matches / 27 files

Top offenders chưa migrate:
- `streamUpload.ts`: 10 console.log
- `UnifiedAuthForm.tsx`: 2 console.log
- `VideoUploaderUppy.tsx`: 2 console.log
- `liveService.ts`: 1 console.log
- `useDonationFlow.ts`: 2 console.error (đã dùng, nhưng nên dùng logger)
- `StreamPlayer.tsx`: 3 console.log

### 9. `UnifiedGiftSendDialog.tsx` dòng 666 — `as any` cho donations update

```typescript
await supabase.from('donations').update({
  card_theme: themeId,
  card_background: bgIndex.toString(),
  card_sound: soundId,
} as any).eq('id', celebrationData.id);
```

Columns `card_theme`, `card_background`, `card_sound` có thể không có trong generated types. Cần kiểm tra schema hoặc dùng typed update.

### 10. `MessageThread.tsx` — TODO "Scroll to message" chưa implement

Dòng 131: `// TODO: Scroll to message` — đã tồn tại từ vòng 6, chưa xử lý.

---

## III. ĐIỂM TỔNG KẾT (Vòng 8)

| Hạng mục | Vòng 7 | Vòng 8 | Ghi chú |
|----------|--------|--------|---------|
| Auth/Session | 9.0 | 9.0 | Ổn định |
| Type Safety | 8.0 | 8.0 | 371 `as any` còn lại, nhưng `useState<any>` = 0 |
| Hiệu năng | 8.5 | 8.5 | UnifiedGiftSendDialog chưa refactor thực tế |
| Bảo mật | 9.0 | 9.0 | All acknowledged, public by design |
| Code Quality | 8.5 | 8.5 | 456 console.log, dead code mới |
| Architecture | 8.5 | 8.5 | supabaseJsonHelpers có nhưng chưa dùng |
| **Tổng (weighted)** | **8.6** | **8.6** | Cần 12 điểm cải thiện để đạt 9.4+ |

---

## IV. KẾ HOẠCH ĐẠT 9.4+ — 12 ĐIỂM

### BATCH A: Eliminate `supabase as any` + Integrate helpers (HIGH)

**1. Migrate `liveService.ts` — xóa `const db = supabase as any`**
- Import `toJson`, `mergeJson` từ `supabaseJsonHelpers`
- Thay `db.from(...)` → `supabase.from(...)` với `toJson()` cho metadata fields
- Cập nhật `mergeLivePostMetadata()` dùng `mergeJson()`
- `normalizeLiveSession(row: any)` → typed parameter từ Supabase query result

**2. Fix `useLiveHeartbeat.ts` — xóa `(supabase as any)`**
- `.update({ updated_at: ... })` không cần cast — field `updated_at` là string chuẩn

**3. Fix `ProfileHeader.tsx` — xóa 5 `(profile as any)` casts**
- `ProfileData` đã có `external_wallet_address`, `custodial_wallet_address`, `wallet_address`
- Xóa tất cả `as any` → dùng trực tiếp `profile.external_wallet_address`

**4. Fix `UnifiedGiftSendDialog.tsx` dòng 666 — typed donations update**
- Dùng `toJson()` wrapper hoặc kiểm tra schema có columns `card_theme`, `card_background`, `card_sound`

### BATCH B: Realtime payload typing (MEDIUM-HIGH)

**5. Type realtime payloads — 7 files, ~50 instances**
- Tạo typed interfaces cho mỗi table row: `LiveCommentRow`, `LiveReactionRow`, `LiveMessageRow`, `MessageRow`, `MessageReactionRow`, `MessageReadRow`, `CallSessionRow`
- Replace `payload.new as any` → `(payload.new as LiveCommentRow)` (hoặc typed channel subscription)
- Files: `useMessages.ts`, `useAgoraCall.ts`, `useLiveComments.ts`, `useLiveReactions.ts`, `useLiveMessages.ts`, `useChatNotifications.ts` (2 files)

### BATCH C: Dead code cleanup + console.log migration (MEDIUM)

**6. Xóa hoặc tích hợp `GiftRecipientSearch.tsx` + `GiftConfirmStep.tsx`**
- Hai file này không import bởi ai → dead code
- Option A: Tích hợp vào UnifiedGiftSendDialog (refactor ~400 dòng ra)
- Option B: Xóa (phức tạp refactor, chưa ưu tiên)
- Đề xuất: **Xóa** — refactor UnifiedGiftSendDialog cần phiên riêng vì component quá lớn

**7. Migrate console.log → logger (6 core files)**
- `streamUpload.ts` (10 instances)
- `UnifiedAuthForm.tsx` (2)
- `VideoUploaderUppy.tsx` (2)
- `liveService.ts` (1)
- `StreamPlayer.tsx` (3)
- `useDonationFlow.ts` (2 console.error → logger.error)

### BATCH D: Minor type fixes + TODO (LOW-MEDIUM)

**8. Fix `t(key as any)` — 3 files**
- Thêm missing i18n keys vào `TranslationKeys` type
- Hoặc document cast: `t(key as TranslationKey)` — ít nhất typed hơn `any`

**9. Document `(connector as any).getProvider()` — wagmi v2 gap**
- Thêm comment giải thích: wagmi v2 không expose `getProvider` typed, cast justified
- Không cần fix — wagmi type limitation

**10. Implement MessageThread scroll-to-message TODO**
- Thêm `messageRefs = useRef<Map<string, HTMLDivElement>>()`
- Khi `onSelectMessage(id)` → `messageRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth' })`

**11. Fix `searchHistory.ts` — `(supabase as any).from('search_history')`**
- Table `search_history` chưa có trong generated types
- Giữ cast nhưng narrow scope: document rõ "table exists but not in codegen"

**12. Fix duplicate `useChatNotifications` — 2 files cùng tên**
- `src/hooks/useChatNotifications.ts`
- `src/modules/chat/hooks/useChatNotifications.ts`
- Verify nếu một trong hai là dead code → xóa

---

## V. DỰ BÁO ĐIỂM SAU CẢI THIỆN

| Hạng mục | Hiện tại | Sau Batch A-D | Delta |
|----------|----------|--------------|-------|
| Auth/Session | 9.0 | 9.5 | +0.5 |
| Type Safety | 8.0 | 9.5 | +1.5 (loại bỏ ~80 `as any` quan trọng) |
| Hiệu năng | 8.5 | 8.5 | = (UnifiedGiftSendDialog chưa refactor) |
| Bảo mật | 9.0 | 9.5 | +0.5 |
| Code Quality | 8.5 | 9.5 | +1.0 (logger, dead code, TODO) |
| Architecture | 8.5 | 9.5 | +1.0 (helpers integrated, clean imports) |
| **Tổng** | **8.6** | **9.4** | **+0.8** |

---

## VI. THỨ TỰ THỰC HIỆN

```text
Batch A (Tasks 1-4):  Eliminate supabase as any + ProfileHeader   — ~30 phút
Batch B (Task 5):     Realtime payload typing                      — ~20 phút
Batch C (Tasks 6-7):  Dead code + console.log                     — ~20 phút
Batch D (Tasks 8-12): Minor fixes + scroll-to-message + dedup     — ~20 phút
```

Tổng cộng 4 batches trong 1 phiên để đạt mục tiêu 9.4+.

