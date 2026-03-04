

# VÒNG 8 — KẾ HOẠCH GIẢI QUYẾT TỒN ĐỌNG

---

## I. TỔNG KẾT TỒN ĐỌNG

| # | Vấn đề | Phạm vi |
|---|--------|---------|
| 1 | `social_links as any` — AvatarOrbit (6), Profile.tsx (1), EditProfile (5) | 12 casts |
| 2 | Realtime `payload.new as any` — useMessages (3), useAgoraCall (2) | 5 casts |
| 3 | `metadata as any` — MessageBubble (2) | 2 casts |
| 4 | `(data as any)` — EditProfile (5 fields), PostModerationTab, InlineSearch, AppHonorBoard, usePins, useRedEnvelope, useUserDirectory, useAdminUsers | ~20 casts |
| 5 | `error as any` → `unknown` — LiveHostPage, useLiveRtc | 2 functions |
| 6 | `(connector as any).getProvider()` — ActiveAccountContext | 2 casts (wagmi gap) |
| 7 | `(window as any).ethereum` — ClaimRewardDialog | 1 cast (browser global) |
| 8 | `(window as any).webkitAudioContext` — useChatNotifications | 1 cast (Safari compat) |
| 9 | `t(key as any)` — 3 files | 3 casts |
| 10 | `console.log` — useAgoraCall (18), AdminMigration (12), usePendingDonationRecovery (3), sdk-package/IntegrationDocs (doc examples) | ~35 thực tế cần migrate |

---

## II. PHÂN LOẠI — CÓ THỂ FIX vs CHẤP NHẬN

**Có thể fix hoàn toàn (giảm ~40 `as any`):**
- `social_links as any` → dùng `toJson()` từ supabaseJsonHelpers
- `payload.new as any` → dùng typed rows từ `realtimeRows.ts`
- `metadata as any` → tạo `StickerMetadata`, `RedEnvelopeMetadata` interfaces
- `EditProfile (data as any).field` → mở rộng select query hoặc type assert hẹp
- `error as any` → pattern `error instanceof Error`
- `(data as any)` trong admin/rpc hooks → typed rpc responses

**Chấp nhận (document, không fix):**
- `(connector as any).getProvider()` — wagmi v2 type gap, không có typed alternative
- `(window as any).ethereum` — EIP-1193 global, chuẩn industry
- `(window as any).webkitAudioContext` — Safari compat, chuẩn industry
- `t(key as any)` — i18n dynamic keys, fix cần refactor translation type system
- `console.log` trong `sdk-package/` và `IntegrationDocs.tsx` — đây là doc examples
- `searchHistory.ts` `supabase as any` — table chưa có trong codegen, đã documented

---

## III. KẾ HOẠCH — 8 TASKS

### Task 1: Fix `social_links as any` → `toJson()` (3 files, 12 instances)

**AvatarOrbit.tsx** (6 instances dòng 211, 285, 308, 324, 351, 386):
```
// TRƯỚC: .update({ social_links: newLinks as any })
// SAU:   .update({ social_links: toJson(newLinks) })
```

**Profile.tsx** (1 instance dòng 318):
```
// TRƯỚC: (profile.social_links as any[]).map(...)
// SAU:   fromJson<SocialLink[]>(profile.social_links)?.map(...)
```

**EditProfile.tsx** (5 instances dòng 85-89):
Các field `location`, `workplace`, `education`, `relationship_status`, `social_links` đang cast `as any` vì select `*` trả về type chuẩn nhưng thiếu fields này trong generated types. Fix: dùng explicit type assertion 1 lần rồi truy cập trực tiếp.

### Task 2: Fix realtime `payload.new as any` còn lại (2 files, 5 instances)

**useMessages.ts:**
- Dòng 188: `payload.new as any` → `payload.new as MessageRow`
- Dòng 236: `(payload.new || payload.old) as any` → typed `MessageReactionRow`
- Dòng 243, 255, 266: `(r: any)` → `(r: MessageReactionRow)`
- Dòng 276: `payload.new as any` → typed `MessageReadRow`

**useAgoraCall.ts:**
- Dòng 753, 773: `payload.new as any` → `payload.new as CallSessionRow`

Thêm `MessageReactionRow` và `MessageReadRow` vào `realtimeRows.ts`.

### Task 3: Fix `metadata as any` — MessageBubble (2 instances)

Tạo interfaces:
```typescript
interface StickerMetadata { sticker?: { url?: string; name?: string } }
interface RedEnvelopeMetadata { envelope_id?: string; amount?: number }
```

Thay `message.metadata as any` → `fromJson<StickerMetadata>(message.metadata)`.

### Task 4: Fix `error as any` → proper `unknown` handling (2 files)

**LiveHostPage.tsx** `toUserError()` và **useLiveRtc.ts** `mapRtcError()`:
```typescript
// TRƯỚC: const anyErr = error as any;
// SAU:
function toUserError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  ...
}
```

### Task 5: Fix `(data as any)` trong admin/query hooks (6 files)

- **PostModerationTab.tsx**: `(data as any)` → typed query result
- **InlineSearch.tsx**: `(postData as any)` → typed
- **AppHonorBoard.tsx**: `(data as any)?.[0]` → typed rpc result
- **useUserDirectory.ts**: `(data as any)?.[0]` + `(emailsData as any[])` → typed
- **useAdminUsers.ts**: `(emailsData as any[])` → typed
- **usePins.ts / useRedEnvelope.ts / RedEnvelopeCard.tsx**: `data as any as T` → proper cast

### Task 6: Migrate `console.log` → `logger` (3 files thực tế)

- **useAgoraCall.ts**: 18 `console.log` → `logger.debug`
- **AdminMigration.tsx**: 12 `console.log` → `logger.debug`
- **usePendingDonationRecovery.ts**: 3 `console.log` → `logger.debug`

Bỏ qua: `sdk-package/`, `IntegrationDocs.tsx` (doc examples), `useDonationFlow.ts` (đã dùng logger).

### Task 7: Document wagmi/browser `as any` casts (3 files)

- **ActiveAccountContext.tsx**: Thêm comment `/* wagmi v2 — getProvider not typed */`
- **ClaimRewardDialog.tsx**: Thêm comment `/* EIP-1193 browser global */`
- **useChatNotifications.ts**: Thêm comment `/* Safari WebKit compat */`

### Task 8: Document i18n `t(key as any)` casts (3 files)

- **CommentReactionButton.tsx**, **ShareDialog.tsx**, **ClassicEmailLogin.tsx**: Thêm comment `/* dynamic i18n key — not in static TranslationKeys */`

---

## IV. DỰ KIẾN KẾT QUẢ

| Metric | Trước | Sau |
|--------|-------|-----|
| `as any` (src/, không sdk-package) | ~321 | ~265 (giảm ~56) |
| `console.log` (src/) | ~35 thực tế | ~2 (chỉ còn documented casts) |
| Undocumented `as any` | ~40 | 0 |
| **Type Safety score** | 8.0 | 9.5 |
| **Code Quality score** | 8.5 | 9.5 |

*Ghi chú: ~265 `as any` còn lại chủ yếu nằm trong admin components (edge function responses) và wagmi/browser globals — đã documented hoặc cần refactor lớn hơn.*

