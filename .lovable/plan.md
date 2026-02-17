
# Fix: Gift Dialog Search Spinning and Can't Confirm

## Root Cause Analysis

There are **3 related issues** causing problems:

### Issue 1: Missing Wallet Address in Feed Data
The feed query (`useFeedPosts.ts`) only selects `external_wallet_address` and `custodial_wallet_address` from profiles. However, **80 users** only have wallets in `wallet_address` or `public_wallet_address` columns. When opening the gift dialog from a post for these users, the wallet address is null, making the confirm button permanently disabled.

### Issue 2: Auth Session Instability Causing Re-renders
The console shows `[AuthKeeper] Token refresh failed: timeout`. Several components still react to null sessions during token refresh (not just `SIGNED_OUT`), causing unnecessary re-renders that can disrupt the gift dialog's state:
- `Profile.tsx` - clears currentUserId on any null session
- `FacebookLeftSidebar.tsx` - clears profile/admin state on null session
- `DonationReceivedNotification.tsx` - clears userId on null session
- `GuestSignupPrompt.tsx` - sets isGuest on null session

### Issue 3: Wallet Address Not Fully Resolved in DonationButton
`FacebookPostCard.tsx` and `Profile.tsx` pass `external_wallet_address || custodial_wallet_address` to DonationButton, missing `public_wallet_address` and `wallet_address` (the most common wallet columns with 380 and 288 users respectively).

---

## Fix Plan

### File 1: `src/hooks/useFeedPosts.ts`
Add `public_wallet_address` and `wallet_address` to the profiles select query (2 locations: highlighted posts query and main feed query).

### File 2: `src/components/feed/FacebookPostCard.tsx`
Update DonationButton wallet address to include all wallet columns with priority: `public_wallet_address > external_wallet_address > wallet_address > custodial_wallet_address`

### File 3: `src/pages/Profile.tsx`  
- Update DonationButton wallet address resolution (same priority)
- Fix `onAuthStateChange` to only clear state on `SIGNED_OUT` event

### File 4: `src/components/feed/FacebookLeftSidebar.tsx`
Fix `onAuthStateChange` to only clear profile/admin on `SIGNED_OUT`

### File 5: `src/components/donations/DonationReceivedNotification.tsx`
Fix `onAuthStateChange` to only clear userId on `SIGNED_OUT`

### File 6: `src/components/auth/GuestSignupPrompt.tsx`
Fix `onAuthStateChange` to only set isGuest on `SIGNED_OUT`

### File 7: `src/App.tsx` (AuthSessionKeeper)
Improve token refresh resilience: increase timeout from 10s to 20s and add retry logic.

---

## Summary
- 7 files modified
- Fixes wallet address resolution across feed, posts, and profiles
- Stabilizes auth session to prevent dialog state resets
- All users with any type of wallet can receive gifts
