

## Plan: Fix Transaction History to Use Moralis API

### Problem
The `fetch-wallet-history` edge function uses BscScan API **without an API key** (`BSCSCAN_API_KEY` is not configured). BscScan's free tier without a key is heavily rate-limited and often returns empty results. This is why the user sees "0" for everything.

### Solution
Replace BscScan with **Moralis API**, which is already configured (`MORALIS_API_KEY` exists) and used extensively throughout the project for similar transaction-fetching tasks.

### Changes

**1. Rewrite `supabase/functions/fetch-wallet-history/index.ts`**
- Use Moralis API v2.2 endpoints instead of BscScan:
  - `GET /{address}` for native transactions (replaces `txlist`)
  - `GET /{address}/erc20/transfers` for BEP-20 token transfers (replaces `tokentx`)
- Query both `bsc` (mainnet, chainId 56) and `bsc testnet` (testnet, chainId 97)
- Map Moralis response fields to the existing `WalletTx` interface format so the frontend needs minimal changes
- Add console logging for debugging
- Support pagination via Moralis cursor

**2. Update `src/hooks/useWalletHistory.ts`**
- Minor adjustments to handle Moralis response format differences (e.g. `block_timestamp` instead of `timeStamp`, different field names)
- Update the `WalletTx` interface if needed to accommodate Moralis fields

**3. Update `src/components/profile/WalletTransactionHistory.tsx`**
- Adjust timestamp formatting if Moralis returns ISO dates instead of Unix timestamps
- Add `DialogDescription` to fix the accessibility warning in console

No database changes needed. No new secrets needed (MORALIS_API_KEY already exists).

