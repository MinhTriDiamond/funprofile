

## Plan: Public Wallet Transaction History on Profile

### Overview
Add a "Lịch sử giao dịch" button below the wallet address on the profile page. When clicked, it opens a modal showing the full public transaction history fetched directly from **BscScan API** (free public endpoints). No auth required to view.

### Technical Approach

**Data Source**: BscScan public API endpoints (no API key required for basic usage, rate-limited at ~5 req/sec):
- `api.bscscan.com/api?module=account&action=txlist&address={addr}` (normal txs)
- `api.bscscan.com/api?module=account&action=tokentx&address={addr}` (BEP-20 token txs)
- Testnet equivalent for FUN token transactions

Since BscScan API has CORS restrictions, we'll create an **edge function** to proxy requests.

### Changes

**1. Edge Function: `supabase/functions/fetch-wallet-history/index.ts`**
- Accepts `address`, `page`, `offset`, `sort`, `action` (txlist/tokentx)
- Proxies to BscScan API (mainnet + testnet)
- Returns combined, sorted results
- No auth required (public endpoint)
- Optional: accepts BscScan API key from secrets for higher rate limits

**2. New Hook: `src/hooks/useWalletHistory.ts`**
- Fetches transaction history via the edge function
- Accepts wallet address as parameter
- Supports pagination, filtering (send/receive), sorting
- Computes summary stats (total sent, total received)

**3. New Component: `src/components/profile/WalletTransactionHistory.tsx`**
- Modal dialog triggered by a button
- Responsive table showing: timestamp, type (Send/Receive with color coding), amount + token, from/to addresses (linked to BscScan), status, tx hash (linked), gas fee
- Filter tabs: All / Receive (green) / Send (red)
- Pagination controls
- Summary card at top: total received, total sent, transaction count
- Green color for receive, red for send/withdraw

**4. Update: `src/components/profile/ProfileHeader.tsx`**
- Add a clickable "Lịch sử giao dịch" button/badge right below the wallet address display (line ~166)
- Opens the WalletTransactionHistory modal
- Visible to everyone (no auth check), only shown when `displayAddress` exists

### Design Details
- Button style: outline with Clock icon, matches existing profile UI (green theme)
- Modal: full-width dialog with table, inspired by BscScan address page
- Mobile: cards instead of table rows for small screens
- Automatically updates when viewing different profiles (wallet address changes)

### Security
- Edge function is public (no auth required, matching the "public by design" philosophy)
- Only reads from BscScan public API, no write operations
- Rate limiting via BscScan's own limits; optionally add API key secret for higher limits

