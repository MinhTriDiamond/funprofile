
# Fix: Batch Submit Race Condition and On-Chain Balance Discrepancy

## Problem

The system shows TONG = 6,290 FUN on-chain but the database only records 5,150 FUN as confirmed. The difference (1,140 FUN) comes from transactions that were marked "failed" in the database but actually succeeded on-chain.

**Root cause**: When batch-submitting multiple transactions, they fire within seconds of each other. This causes:
1. Nonce conflicts on the blockchain
2. `waitForTransactionReceipt` timeouts
3. The error handler marks the request as "failed" even though the transaction was broadcast and may succeed

## Solution (3 Parts)

### Part 1: Sequential Batch Submit with Confirmation Wait

Fix `batchSubmitToChain` in `usePplpAdmin.ts` to wait for each transaction to be fully confirmed before submitting the next one. Add a delay between transactions to avoid nonce conflicts.

**Changes**: `src/hooks/usePplpAdmin.ts`
- In `batchSubmitToChain`: After each `submitToChain` call, add a 3-second delay before processing the next request
- This prevents nonce race conditions

### Part 2: Reconciliation Function for Failed Transactions

Create a new function `reconcileFailedRequests` in `usePplpAdmin.ts` that:
1. Fetches all "failed" requests that have a `tx_hash`
2. For each, checks the actual transaction receipt on-chain via `publicClient.getTransactionReceipt()`
3. If receipt shows `status: 'success'`, updates the DB to `confirmed` and marks light_actions as `minted`
4. If receipt shows `status: 'reverted'` or no receipt found, keeps as `failed`

**Changes**: `src/hooks/usePplpAdmin.ts`
- Add `reconcileFailedRequests` function
- Export it from the hook

### Part 3: Admin UI - Reconciliation Button

Add a "Reconcile Failed TXs" button in the Failed tab of PplpMintTab that:
1. Scans all failed requests with tx_hash
2. Checks on-chain status
3. Auto-corrects DB status
4. Shows summary of corrections

**Changes**: `src/components/admin/PplpMintTab.tsx`
- Add reconciliation button in the Failed tab header
- Show progress and results

## Technical Details

### Reconciliation Logic (Part 2)
```text
For each failed request with tx_hash:
  1. Call publicClient.getTransactionReceipt({ hash: tx_hash })
  2. If receipt.status === 'success':
     - Update pplp_mint_requests: status = 'confirmed', confirmed_at = now
     - Update light_actions: mint_status = 'minted'
     - Count as reconciled
  3. If receipt.status === 'reverted' or no receipt:
     - Keep as 'failed' (genuinely failed)
  4. Report summary: X reconciled, Y genuinely failed
```

### Sequential Submit Fix (Part 1)
```text
batchSubmitToChain:
  for each request:
    1. Submit to chain (includes auto-confirm wait)
    2. Wait 3 seconds before next request
    3. Update progress UI
  This ensures nonce increments properly between txs
```

### Files to Modify
1. `src/hooks/usePplpAdmin.ts` - Add reconciliation function + fix batch submit delay
2. `src/components/admin/PplpMintTab.tsx` - Add reconciliation button in Failed tab

### Expected Outcome
- After running reconciliation: Failed requests that actually succeeded on-chain will be corrected to "confirmed"
- Future batch submits will not have nonce race conditions
- The TONG balance will match the database confirmed total
