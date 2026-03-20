

## Fix: Mobile Chat Header Overflow/Clipping

### Problem
On small screens (320–480px), the header has too many elements competing for space: back button + avatar + name + 4-5 action buttons. The username gets clipped and action buttons overflow.

### Root Cause (lines 436-510)
- The left section (`min-w-0` div) and right section (action buttons) both grow unconstrained
- The username `<p>` has no truncation classes
- Action buttons don't have `shrink-0` to prevent compression
- Avatar doesn't have `shrink-0`

### Changes — `src/modules/chat/components/MessageThread.tsx`

**1. Username truncation** (line 457-458):
- Add `min-w-0` to the inner `<div>` wrapping name/status
- Add `truncate max-w-[120px] sm:max-w-[200px]` to the `<p>` with `headerName`

**2. Avatar shrink protection** (line 453):
- Add `shrink-0` to Avatar

**3. Right-side buttons shrink protection** (line 471):
- Add `shrink-0` to the action buttons container

**4. Reduce icon sizes on mobile** (lines 473-498):
- Change icon classes from `h-5 w-5` to `h-4 w-4` for call/search/settings buttons
- Reduce button size with `size="sm"` or use `h-8 w-8` custom sizing for tighter fit

**5. Compact padding** (line 436):
- Change `p-3` to `px-2 py-2 sm:p-3` for tighter mobile spacing

This ensures: back ← avatar → truncated name ... | phone video search ⋯ all visible without clipping.

