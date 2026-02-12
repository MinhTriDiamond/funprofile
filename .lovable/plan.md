
# Fix 3 issues: Sync Error + RICH Text Hidden + Confetti Overwhelming

## Issue 1: Sync Error "Chưa ghi nhận được vào hệ thống"

**Root cause**: The `record-donation` edge function crashes at line 152 with:
```
TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))
```

The code passes a Supabase query builder to `.in()`, but `.in()` expects a plain array. This causes the entire function to fail, so the donation is never recorded in the database.

**Fix**: In `supabase/functions/record-donation/index.ts`, replace the subquery approach with a two-step query:
1. First query: get all `conversation_id` values for the recipient
2. Second query: filter sender's conversations using the resulting array

## Issue 2: RICH Text Not Visible

**Root cause**: The confetti fires every 400ms with 120-150 particles per burst, plus fireworks every 800ms. This creates a wall of confetti that completely covers the RICH text floating underneath.

**Fix**: In `src/components/donations/DonationCelebration.tsx`:
- Reduce `particleCount` per burst (120 down to 40-50)
- Increase intervals (confetti: 400ms to 1500ms, fireworks: 800ms to 2500ms)
- Reduce `ticks` from 300 to 150 so particles disappear faster
- This allows the RICH text to be clearly visible between confetti bursts

## Issue 3: Confetti Covering Card

Same fix as Issue 2. The reduced density will let the card content remain readable.

## Files to change

1. **`supabase/functions/record-donation/index.ts`** (lines 148-158)
   - Replace `.in(field, subquery)` with two separate queries
   - First fetch recipient's conversation IDs as an array, then use `.in(field, array)`

2. **`src/components/donations/DonationCelebration.tsx`**
   - Reduce `particleCount` in all `confetti()` calls (40-50 instead of 60-120)
   - Increase `fireConfetti` interval from 400ms to 1500ms
   - Increase `fireFirework` interval from 800ms to 2500ms
   - Reduce `ticks` from 300 to 150

## Expected results
- Donations will be recorded successfully in the database (no more sync error toast)
- RICH text will be clearly visible, dancing across the screen in 9 rainbow colors
- Confetti and fireworks will still fire but at a balanced intensity that does not obscure the card or the RICH text
