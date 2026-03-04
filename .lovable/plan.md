

# AUDIT TOÀN DIỆN — VÒNG 9

---

## I. TỔNG KẾT HIỆN TRẠNG

Sau các vòng cải thiện 7-8, codebase đã tiến bộ đáng kể. Dưới đây là các vấn đề **thực sự còn tồn đọng** được phân loại theo mức độ ưu tiên.

---

## II. TỒN ĐỌNG CÒN LẠI

### A. `as any` — 177 matches / 20 files

| Nhóm | File | Vấn đề | Có thể fix? |
|------|------|--------|-------------|
| 1 | `Profile.tsx` (2) | `onSetProfile={setProfile as any}` — type mismatch giữa `useState` setter và prop `(updater: ...) => void` | ✅ Fix bằng wrapper function |
| 2 | `EditProfile.tsx` (1) | `.update({...} as any)` — `social_links` cần `toJson()` | ✅ Đã có helper |
| 3 | `DonationHistoryTab.tsx` (3) | `(selectedDonation as any).card_theme/card_background/card_sound` — columns không có trong generated types | ⚠️ Document hoặc extend type |
| 4 | `useMessages.ts` (8) | `payload.new as any`, `(r: any)` trong realtime callbacks | ✅ Dùng typed rows |
| 5 | `usePplpAdmin.ts` (5) | `multisig_signatures as any`, `receiptError: any`, `} as any) as bigint` | ⚠️ Phần lớn justified (wagmi/viem) |
| 6 | `useEpochAllocation.ts` (2) | `epochs[0] as any`, `alloc as any` — RPC result untyped | ✅ Tạo interface |
| 7 | `GiftCelebrationModal.tsx` (2) | `style={{ '--tw-ring-color': ... } as any}` — CSS custom property pattern | ⚠️ Chuẩn React pattern, chấp nhận |
| 8 | `InlineSearch.tsx` (2) | `(postData as any)` + `(p: any)` | ✅ Type search result |
| 9 | `useAttesterSigning.ts` (1) | `newSigs as any` — JSON column | ✅ Dùng `toJson()` |
| 10 | `deviceFingerprint.ts` (1) | `(navigator as any).deviceMemory` — Web API gap | ⚠️ Document |
| 11 | `searchHistory.ts` (1) | `(supabase as any).from('search_history')` — table not in codegen | ⚠️ Đã documented |

### B. `catch (e: any)` — 325 matches / 36 files

Đây là vấn đề **lớn nhất** còn lại. Tập trung ở:
- `usePplpAdmin.ts`: 8 instances
- `MessageThread.tsx`: 4 instances  
- `WalletAbuseTab.tsx`: 8 instances
- `QuickDeleteTab.tsx`: 2 instances
- `Users.tsx`: 2 instances
- `TransactionLookup.tsx`: 1 instance
- `chunkedVideoDownload.ts`: 1 instance
- Và ~20 file admin/utility khác

Pattern cần fix: `catch (error: any) { toast.error(error.message) }` → `catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Lỗi') }`

### C. `console.log` — 168 matches / 11 files

| File | Số lượng | Loại |
|------|----------|------|
| `usePplpAdmin.ts` | ~12 | Blockchain debug — nên dùng `logger.debug` |
| `streamHelpers.ts` | 6 | Storage ops — nên dùng `logger.debug` |
| `IntegrationDocs.tsx` | ~15 | Doc examples — chấp nhận |
| `useMediaDevices.ts` | 1 | Device enum — `logger.debug` |
| `logger.ts` | 1 | Chính logger — OK |

### D. `useState<any>` — 4 files admin

Tất cả 4 đều đã có eslint comment `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic edge function response`. Đây là admin-only components nhận dynamic edge function responses — **chấp nhận** nhưng có thể cải thiện bằng generic response type.

### E. Realtime `payload.new as any` — 2 file còn lại

- `useMessages.ts` dòng 188, 201, 236, 276: Vẫn còn `as any` cho messages, reactions, reads
- Đã tạo `realtimeRows.ts` nhưng **chưa import** vào `useMessages.ts`

---

## III. KẾ HOẠCH CẢI THIỆN — 6 TASKS

### Task 1: Fix `catch (error: any)` → `catch (error: unknown)` (TOP PRIORITY — 36 files)

Áp dụng pattern chuẩn cho tất cả ~35 instances có thể fix:
```typescript
// TRƯỚC: catch (error: any) { toast.error(error.message) }
// SAU:   catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Lỗi') }
```

Files chính: `MessageThread.tsx` (4), `WalletAbuseTab.tsx` (8), `QuickDeleteTab.tsx` (2), `Users.tsx` (2), `usePplpAdmin.ts` (8), `TransactionLookup.tsx` (1), `chunkedVideoDownload.ts` (1), và các admin files khác.

### Task 2: Fix `useMessages.ts` — realtime typing hoàn chỉnh

Import `MessageRow`, `MessageReactionRow`, `MessageReadRow` từ `realtimeRows.ts`:
- Dòng 188: `payload.new as any` → `payload.new as MessageRow`
- Dòng 201: `payload.old as any` → `payload.old as MessageRow`  
- Dòng 236: `(payload.new || payload.old) as any` → typed `MessageReactionRow`
- Dòng 243, 255, 266: `(r: any)` → `(r: MessageReactionRow)`
- Dòng 217-219: `(p: any)` → typed page result

### Task 3: Fix `Profile.tsx` — `onSetProfile={setProfile as any}` (2 instances)

`setProfile` là `Dispatch<SetStateAction<ProfileData | null>>` nhưng prop expect `(updater: (prev: ProfileData | null) => ProfileData | null) => void`. Fix: tạo wrapper callback hoặc widen prop type.

### Task 4: Migrate `console.log` → `logger` (2 files)

- `usePplpAdmin.ts`: ~12 `console.log` → `logger.debug`
- `streamHelpers.ts`: 6 `console.log` → `logger.debug`
- `useMediaDevices.ts`: 1 → `logger.debug`

### Task 5: Fix `EditProfile.tsx` — `as any` cho update + `DonationHistoryTab.tsx`

- `EditProfile.tsx` dòng 290: `.update({...} as any)` → dùng `toJson()` cho `social_links`
- `DonationHistoryTab.tsx` (3): Tạo extended donation type với `card_theme`, `card_background`, `card_sound`

### Task 6: Fix minor `as any` — `useEpochAllocation.ts`, `useAttesterSigning.ts`, `InlineSearch.tsx`

- `useEpochAllocation.ts`: Tạo `EpochData` interface cho RPC result
- `useAttesterSigning.ts`: `newSigs as any` → `toJson(newSigs)`
- `InlineSearch.tsx`: Type search post result

---

## IV. ĐIỂM ĐÁNH GIÁ

| Hạng mục | Hiện tại | Sau Task 1-6 | Ghi chú |
|----------|----------|-------------|---------|
| Auth/Session | 9.5 | 9.5 | Ổn định |
| Type Safety | 8.5 | 9.5 | Loại bỏ ~60 `as any` + 35 `catch any` |
| Hiệu năng | 9.0 | 9.0 | UnifiedGiftSendDialog đã refactor ✅ |
| Bảo mật | 9.5 | 9.5 | RLS + admin checks OK |
| Code Quality | 8.5 | 9.5 | Logger migration + error handling |
| Architecture | 9.5 | 9.5 | Hooks + sub-components pattern ✅ |
| **Tổng (weighted)** | **9.0** | **9.5** | |

