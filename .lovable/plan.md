

## Problem
The `[&>button]:hidden` class on line 137 explicitly hides the default Dialog close button. Users on mobile have no way to dismiss the success modal.

## Plan

### File: `src/components/donations/DonationSuccessCard.tsx`

1. **Remove `[&>button]:hidden`** from DialogContent className (line 137) — this re-enables the default X button from the Dialog component

2. **Style the default close button** to match the card design by replacing the hidden class with a visible styled override:
   ```
   [&>button]:z-[10] [&>button]:top-3 [&>button]:right-3 [&>button]:rounded-full 
   [&>button]:bg-white/80 [&>button]:backdrop-blur [&>button]:shadow-md 
   [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center 
   [&>button]:justify-center [&>button]:opacity-100
   ```

3. **Add a "Đóng" (Close) bottom button** below the action buttons area — a full-width outlined button that provides an obvious mobile-friendly close target, calling `handleClose()`

4. **Add auto-close after 8 seconds** with a `useEffect` that calls `handleClose()` via `setTimeout`, cleared on unmount or manual close. This ensures non-blocking UX even if users don't notice the X button.

No other files need changes. Backdrop click and ESC already work via the Dialog `onOpenChange` handler on line 135.

