

# Kế hoạch Refactor UnifiedGiftSendDialog (1.293 dòng → ~6 files)

## Tại sao cần refactor?

Component hiện tại là một "God Component" 1.293 dòng chứa **tất cả** trong một file:
- 25+ useState declarations (dòng 110-138)
- Business logic: search, send single/multi, record donation, cache invalidation (dòng 248-657)
- UI rendering: Form step ~300 dòng, Confirm step ~200 dòng, Celebration ~25 dòng
- Duplicated code: `useDonationFlow.ts` đã tồn tại với logic tương tự nhưng **không được sử dụng**

Đặc biệt, `useDonationFlow.ts` (279 dòng) chứa `sendSingle`, `sendMulti`, `recordDonationWithRetry`, `invalidateDonationCache` — tất cả đều bị **duplicate** trong component chính.

## Chiến lược phân tách

```text
UnifiedGiftSendDialog.tsx (1.293 dòng)
├── gift-dialog/types.ts                  (đã có ✅)
├── gift-dialog/useDonationFlow.ts        (đã có ✅ — cần tích hợp)
├── gift-dialog/useGiftDialogState.ts     (MỚI — 25 useState + derived values)
├── gift-dialog/useRecipientSearch.ts     (MỚI — search logic + debounce)
├── gift-dialog/GiftFormStep.tsx          (MỚI — Step 1 UI: sender, token, amount, recipients, message)
├── gift-dialog/GiftConfirmStep.tsx       (MỚI — Step 2 UI: review, progress, send actions)
└── UnifiedGiftSendDialog.tsx             (REFACTORED — ~150 dòng orchestrator)
```

## Chi tiết 5 tasks

### Task 1: Tạo `useRecipientSearch.ts` (~80 dòng)
Trích xuất từ dòng 134-310 và 338-362:
- `searchTab`, `searchQuery`, `searchResults`, `isSearching`, `searchError` states
- `performSearch()` callback với debounce
- `handleSelectRecipient()`, `handleRemoveRecipient()`, `handleClearAllRecipients()`
- `resolveWalletAddress()` helper
- Export: hook trả về tất cả states + handlers

### Task 2: Tạo `useGiftDialogState.ts` (~120 dòng)
Trích xuất từ dòng 110-240:
- Token, amount, message, template states
- Gas estimation effect
- Sender profile fetch effect
- Derived computed values: `formattedBalance`, `parsedAmountNum`, `totalAmount`, `isValidAmount`, `hasEnoughBalance`, `canProceedToConfirm`, etc.
- Reset form effect
- Export: hook trả về tất cả states + computed values + handlers

### Task 3: Tích hợp `useDonationFlow.ts` — xóa duplicate logic
- Xóa dòng 400-657 (handleSendSingle, handleSendMulti, recordDonationWithRetry, recordDonationBackground, recordMultiDonationsSequential, invalidateDonationCache) khỏi component
- Import `useDonationFlow` hook thay thế
- Giữ `handleSend`, `handleSaveTheme`, `handleSendReminder` trong orchestrator (gọi hook methods)

### Task 4: Tạo `GiftFormStep.tsx` (~250 dòng) và `GiftConfirmStep.tsx` (~200 dòng)
- **GiftFormStep**: Trích xuất dòng 768-1064 — Sender info, Token selector, Amount input, Recipient search/display, Quick picks, Message textarea, Warnings, Next button
- **GiftConfirmStep**: Trích xuất dòng 1068-1261 — Review summary, Multi-send progress, TX progress, BscScan link, Action buttons

### Task 5: Refactor `UnifiedGiftSendDialog.tsx` thành orchestrator (~150 dòng)
- Import 3 hooks + 2 step components
- Chỉ giữ: Dialog shell, step indicator, flow routing, celebration modal
- Props interface giữ nguyên — không breaking change cho 6 consumers

## Kết quả dự kiến

| Metric | Trước | Sau |
|--------|-------|-----|
| File chính | 1.293 dòng | ~150 dòng |
| Duplicate code (vs useDonationFlow) | ~250 dòng | 0 |
| Số files | 1 + 2 unused | 6 files có vai trò rõ ràng |
| Testability | Thấp (monolith) | Cao (hooks + components riêng) |

Không thay đổi API — tất cả 6 consumers (`WalletCenterContainer`, `MobileBottomNav`, `GiftNavButton`, `DonationButton`, `ChatInput`, `SendCryptoModal`) giữ nguyên props.

