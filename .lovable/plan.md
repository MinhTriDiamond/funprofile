

## Fix: Mobile Gift/Donation Transactions Failing

### Root Cause Analysis

After reviewing the full transaction flow (`useSendToken.ts` → `UnifiedGiftSendDialog.tsx` → wallet), I identified **3 issues** causing mobile failures:

---

### Problem 1: `account` parameter breaks mobile wallets (CRITICAL)

In `useSendToken.ts` (lines 115-126), `sendTransactionAsync` passes `account: senderAddress` explicitly:

```typescript
hash = await sendTransactionAsync({
  account: senderAddress as `0x${string}`,  // ← THIS breaks mobile
  to: recipient as `0x${string}`,
  value: parseEther(amount),
});
```

WalletConnect-based connectors (MetaMask Mobile, TrustWallet, Bitget) manage the account internally through the connector. Passing `account` explicitly conflicts with the connector's session and causes the transaction to be **rejected silently** or throw a cryptic error. This is a known wagmi v2 issue specific to mobile wallets.

**Fix**: Remove the `account` field from both `sendTransactionAsync` calls and add `chainId` instead.

### Problem 2: Missing `chainId` in transaction calls

Neither the native BNB transfer nor the ERC20 transfer in `useSendToken.ts` specifies which chain to send on. On mobile, this causes the wallet to send on whatever chain it's currently on, leading to chain mismatch errors.

**Fix**: Pass `chainId` (from `useAccount()`) to `sendTransactionAsync`.

### Problem 3: Dialog loses state when switching to wallet app

On mobile, tapping "Confirm" opens the wallet app (MetaMask/TrustWallet). The browser goes to background. When returning:
- `AuthSessionKeeper` may trigger a session refresh that causes re-renders
- If the user takes >30s in the wallet app, the auth refresh could interfere with the pending transaction

**Fix**: Add a guard in `AuthSessionKeeper` to skip refresh when a transaction is in progress, using a global flag.

---

### Changes

**File 1: `src/hooks/useSendToken.ts`**
- Remove `account` parameter from both `sendTransactionAsync` calls (line 115-119 and 122-126)
- Add `chainId` parameter to both calls
- Add better mobile-specific error messages

**File 2: `src/App.tsx`** (AuthSessionKeeper)
- Check a global flag `window.__TX_IN_PROGRESS__` before refreshing session
- Skip refresh if a transaction is actively being signed

**File 3: `src/hooks/useSendToken.ts`** (additional)
- Set `window.__TX_IN_PROGRESS__ = true` at step "signing", reset at `finally`

**File 4: `src/hooks/useDonation.ts`** (same fix)
- Remove `account` from `sendTransactionAsync` (this hook is also used for donations)
- This hook has the same issue but doesn't pass `account` — still needs `chainId` added

