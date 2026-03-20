

## Plan: Remove Auto-Dismiss from Crypto Gift Success Modal

### File: `src/components/donations/DonationSuccessCard.tsx`

Remove the auto-close `useEffect` and its associated `autoCloseRef` — specifically the timer that calls `handleClose()` after 8 seconds. The manual close mechanisms (X button, backdrop click, ESC, "Đóng" button) remain unchanged.

**Changes:**
1. Delete the `autoCloseRef` declaration
2. Delete the `useEffect` block that sets the 8-second `setTimeout`
3. No other files affected

