

# Fix Swap Dialog: Compact Bottom Sheet + No Content Clipping

## Problem Analysis (from screenshot)
1. **Dialog quá cao**: `h-[100dvh]` chiếm toàn bộ màn hình, tạo khoảng trống lớn giữa header và nội dung Swap
2. **Số bị cắt bên phải**: "Số dư: 0,011882..." bị tràn ra ngoài khung vì thiếu `truncate`/`overflow-hidden` trên text
3. **Input amount bị cắt**: Con số nhập vào (phần "0." bên phải) cũng bị ẩn do không có `min-w-0` trên flex child

## Changes (3 files)

### File 1: `src/components/ui/dialog.tsx` (line 41)
Change mobile style from full-screen to compact auto-height sheet:
- `h-[100dvh] max-h-[100dvh]` → `h-auto max-h-[90dvh]`
- This lets the dialog shrink to fit content, max 90% of viewport

### File 2: `src/components/wallet/WalletCenterContainer.tsx` (line 532)
Update DialogContent className to match compact sheet:
- `h-[100dvh] max-h-[100dvh]` → `h-auto max-h-[90dvh]`
- Add `flex flex-col` so SwapTab's flex layout works correctly inside dialog grid

### File 3: `src/components/wallet/SwapTab.tsx`
Fix text overflow issues:
- **Line 277** (balance button): Add `truncate max-w-[60%]` to prevent "Số dư: 0.011882..." from overflowing
- **Line 288-295** (amount input): Add `min-w-0` to prevent flex child from exceeding container width  
- **Line 319** (output amount div): Add `min-w-0 truncate` to prevent long numbers from overflowing
- **Line 267** (root container): Change from `max-h-full` to `flex-1 min-h-0` so it properly fills the dialog's flex column

## Result
- Mobile: Dialog appears as a compact bottom sheet that auto-sizes to content (up to 90dvh), no wasted space
- All numbers fully visible within their containers, truncated with ellipsis if too long
- Desktop: No changes (keeps centered dialog with sm:max-h-[85vh])

