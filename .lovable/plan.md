

# Mở rộng hệ thống FUN Profile cho Bitcoin Network

## Tổng quan

Mở rộng toàn bộ flow giao dịch / chúc mừng / lịch sử cho Bitcoin native, tái sử dụng tối đa kiến trúc BSC hiện có (donations, wallet_transfers, gift_celebration posts, auto messages, notifications).

---

## Giới hạn kỹ thuật quan trọng của Bitcoin

1. **UTXO model** — Bitcoin không dùng account model như EVM. Một giao dịch có thể có nhiều inputs (senders) và nhiều outputs (recipients + change address). Phase 1 chỉ hỗ trợ tốt các tx đơn giản (1 sender → 1 recipient).
2. **Không có smart contract** — không có ERC20/token transfers, chỉ có BTC native.
3. **Confirmation chậm hơn** — ~10 phút/block, cần ≥1 confirmation để kích hoạt social features (tránh double-spend).
4. **Địa chỉ đa dạng** — Legacy (1...), SegWit (3..., bc1q...), Taproot (bc1p...). Cần normalize khi so sánh.
5. **API indexer** — Moralis hỗ trợ Bitcoin, hoặc dùng Blockstream/Mempool.space API (miễn phí, không cần key).

---

## Phase 1 — Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────┐
│ User Profile: btc_address (1 address/user)      │
├─────────────────────────────────────────────────┤
│ Edge Function: scan-btc-transactions            │
│   - Quét BTC address của tất cả users           │
│   - Dùng Blockstream/Mempool API                │
│   - Map sender/recipient → FUN user             │
│   - Upsert vào donations + wallet_transfers     │
│   - Tạo gift_celebration post + notification    │
│   - Gửi auto chat message                       │
├─────────────────────────────────────────────────┤
│ Reuse hoàn toàn:                                │
│   - donations table (chain_id = 0, BTC)         │
│   - wallet_transfers table (chain_id = 0)       │
│   - gift_celebration posts                      │
│   - GiftCelebrationCard UI                      │
│   - HistoryTab + filters                        │
│   - Notification system                         │
│   - Auto chat message                           │
└─────────────────────────────────────────────────┘
```

---

## Phần 1 — Database Migrations

### 1A. Thêm cột `btc_address` vào `profiles`

```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS btc_address TEXT;

CREATE INDEX idx_profiles_btc_address ON public.profiles(btc_address) WHERE btc_address IS NOT NULL;

-- Normalize lowercase
CREATE OR REPLACE FUNCTION normalize_wallet_addresses()
RETURNS TRIGGER ... AS $$
BEGIN
  -- giữ nguyên 4 cột hiện tại + thêm btc_address
  NEW.btc_address := LOWER(NEW.btc_address);
  ...
END;
$$;
```

### 1B. Mở rộng `donations` table

```sql
-- Thêm các cột hỗ trợ Bitcoin
ALTER TABLE public.donations 
  ADD COLUMN IF NOT EXISTS chain_family TEXT NOT NULL DEFAULT 'evm',
  ADD COLUMN IF NOT EXISTS fee TEXT,
  ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_height BIGINT,
  ADD COLUMN IF NOT EXISTS sender_address TEXT,
  ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Cập nhật constraint: cho phép chain_family = 'bitcoin'
-- BTC dùng chain_id = 0 để phân biệt với BSC (56/97)
```

### 1C. Mở rộng `wallet_transfers` table

```sql
ALTER TABLE public.wallet_transfers 
  ADD COLUMN IF NOT EXISTS chain_family TEXT NOT NULL DEFAULT 'evm',
  ADD COLUMN IF NOT EXISTS fee TEXT,
  ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0;
```

### 1D. Cập nhật RPC `get_user_donation_summary`

Thêm BTC vào danh sách token được tổng hợp, giữ logic dedup hiện có.

---

## Phần 2 — Edge Function: `scan-btc-transactions`

**Chức năng:**
- Quét tất cả profiles có `btc_address` không null
- Gọi Mempool.space API (miễn phí, không cần API key): `GET https://mempool.space/api/address/{address}/txs`
- Parse UTXO: xác định sender address (từ vin[0].prevout.scriptpubkey_address) và recipient address (từ vout)
- Map BTC addresses → FUN user_id (tra bảng profiles.btc_address)
- Phân loại:
  - **Cả 2 là FUN user** → `recognized_by_fun = true` → tạo đầy đủ celebration
  - **Chỉ 1 bên là FUN user** → chỉ lưu lịch sử
- Upsert vào `donations` (chain_family='bitcoin', chain_id=0, token_symbol='BTC')
- Upsert vào `wallet_transfers`
- Tạo `gift_celebration` post (reuse format hiện có)
- Tạo notification
- Gửi auto chat message

**Rule kích hoạt social features:**
- ≥1 confirmation (tránh double-spend)
- Cả sender và recipient phải map được FUN user
- Idempotency: check tx_hash tồn tại trước khi tạo (giống moralis-webhook hiện tại)

**Rule xử lý tx fail/dropped:**
- Nếu tx bị drop (không còn trong mempool và không có trong block), update status = 'failed'
- Không tạo/giữ celebration cho tx failed

---

## Phần 3 — Frontend Changes

### 3A. `src/lib/tokens.ts` — Thêm BTC token

```typescript
{
  symbol: 'BTC',
  name: 'Bitcoin',
  address: null,
  decimals: 8,
  logo: btcLogo,        // cần thêm asset
  color: 'from-orange-500 to-yellow-400',
  chainFamily: 'bitcoin',
}
```

### 3B. `src/lib/bscScanHelpers.ts` → `src/lib/explorerHelpers.ts`

Mở rộng để hỗ trợ Bitcoin explorer:
```typescript
export const getExplorerTxUrl = (txHash: string, tokenSymbol?: string, chainFamily?: string) => {
  if (chainFamily === 'bitcoin' || tokenSymbol === 'BTC') {
    return `https://mempool.space/tx/${txHash}`;
  }
  // fallback BSC logic hiện tại
};
```

### 3C. `src/components/feed/GiftCelebrationCard.tsx`

- Hiển thị logo BTC (màu cam/vàng) thay vì CAMLY/FUN coins khi `gift_token === 'BTC'`
- Explorer link trỏ đến mempool.space thay vì bscscan
- Hiển thị "Bitcoin" thay vì "BSC" trong chain info

### 3D. Lịch sử giao dịch — Filter mở rộng

- **HistoryTab**: Thêm filter "Chain" (BSC / Bitcoin / Tất cả)
- **DonationCard / TransferCard**: Hiển thị chain icon (BSC hoặc BTC) và explorer link đúng

### 3E. `src/pages/EditProfile.tsx`

- Thêm input "Địa chỉ ví Bitcoin" để user lưu btc_address
- Validate format BTC address (bắt đầu bằng 1, 3, bc1q, bc1p)

### 3F. Trang chi tiết giao dịch

- Hiển thị thêm: fee, confirmations, block_height cho BTC tx
- Explorer link → mempool.space

---

## Phần 4 — Idempotency & Business Rules

| Rule | Cách xử lý |
|------|------------|
| Trigger celebration | ≥ 1 confirmation + cả 2 bên là FUN user |
| Chống duplicate | Check tx_hash trong donations + posts trước khi insert (giống moralis-webhook) |
| Tx dropped/failed | Update status='failed', không tạo celebration |
| Cùng tx sync nhiều lần | tx_hash UNIQUE constraint + check tồn tại → skip |
| Fake celebration | Chỉ dựa trên blockchain data từ Mempool API, không trust client |

---

## Phần 5 — Transaction Lifecycle cho BTC

```text
1. User lưu btc_address vào profile
2. scan-btc-transactions chạy định kỳ (cron hoặc manual)
3. Quét tx history từ Mempool API
4. Parse sender/recipient từ UTXO
5. Map addresses → FUN users
6. Nếu ≥1 confirmation + cả 2 bên FUN user:
   a. Insert donations (chain_family='bitcoin', chain_id=0)
   b. Insert wallet_transfers
   c. Tạo gift_celebration post
   d. Tạo notification cho recipient
   e. Gửi auto chat message
7. Nếu chỉ 1 bên FUN user:
   a. Insert wallet_transfers (lịch sử)
   b. Không tạo social features
```

---

## Tóm tắt file cần thay đổi

| File | Thay đổi |
|------|----------|
| **Migration mới** | Thêm btc_address, mở rộng donations/wallet_transfers |
| **`supabase/functions/scan-btc-transactions/index.ts`** | Edge function mới — quét BTC |
| **`src/lib/tokens.ts`** | Thêm BTC token metadata |
| **`src/lib/bscScanHelpers.ts`** | Mở rộng cho Bitcoin explorer |
| **`src/components/feed/GiftCelebrationCard.tsx`** | Hỗ trợ hiển thị BTC |
| **`src/pages/EditProfile.tsx`** | Input btc_address |
| **History components** | Filter chain, hiển thị BTC icon |
| **`supabase/functions/scan-my-incoming/index.ts`** | Thêm scan BTC cho user cá nhân |
| **RPC `get_user_donation_summary`** | Gộp BTC vào tổng hợp |
| **Normalize trigger** | Thêm btc_address |

---

## Lưu ý triển khai

- **Mempool.space API** miễn phí, không cần API key — phù hợp Phase 1
- Batch size nên nhỏ (10-20 users/lần) vì Mempool API có rate limit
- Phase 1: 1 user = 1 BTC address. Mở rộng multi-address sau
- Cần thêm BTC logo asset vào `src/assets/tokens/`

