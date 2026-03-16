

# Tính năng Swap Token trong Ví — BNB, USDT, BTCB, CAMLY

## Tóm tắt
Hiện tại nút **Swap** trong ví chỉ mở link PancakeSwap bên ngoài (`window.open`). Cần xây dựng tính năng Swap trực tiếp trong app, hỗ trợ swap giữa BNB, USDT, BTCB, CAMLY qua PancakeSwap Router V2 (on-chain) và 0x API (cho các cặp không có CAMLY).

## Các file cần tạo/sửa

### 1. Tạo `src/config/swap.ts` (MỚI)
Cấu hình swap: chain ID (56 = BSC Mainnet), slippage mặc định (1%), quote TTL (30s).

### 2. Tạo `src/modules/wallet/services/swapAsset.ts` (MỚI)
Service chính xử lý toàn bộ logic swap:
- **Dual routing**: Nếu cặp token có CAMLY → dùng PancakeSwap Router V2 trực tiếp (on-chain call). Các cặp khác (BNB/USDT/BTCB) → gọi 0x API qua edge function proxy.
- Token address mapping dùng `WALLET_TOKENS` từ `src/lib/tokens.ts` (thay vì `TOKEN_META` trong file upload vì project hiện tại dùng `WALLET_TOKENS`).
- Các hàm: `getSwapQuote`, `executeSwap`, `approveToken`, `requiresApproval`, `mapSwapError`, `formatSwapAmount`, `quoteExpired`.
- PancakeSwap routing: luôn đi qua WBNB cho safety (BNB↔Token trực tiếp, Token↔Token qua WBNB).
- FUN token sẽ bị disable (đang triển khai trên testnet).

### 3. Tạo `supabase/functions/swap-quote/index.ts` (MỚI)
Edge function proxy gọi 0x API:
- Nhận `{ path, query }` từ client.
- Forward request đến `https://api.0x.org` với header `0x-api-key` từ secret `ZEROX_API_KEY`.
- Luôn trả 200 + `_status` field để client tự xử lý error (tránh supabase.functions.invoke throw).

### 4. Tạo `src/components/wallet/SwapTab.tsx` (MỚI)
UI component cho màn hình Swap:
- 2 dropdown chọn token (From / To): BNB, USDT, BTCB, CAMLY, FUN.
- Input số lượng + hiển thị số dư token đang chọn.
- Auto-quote sau 550ms debounce khi user nhập số lượng.
- Hiển thị: nhận ước tính, tối thiểu nhận (slippage 1%), gas ước tính.
- Nút chính: "Swap" hoặc "Approve [token]" (nếu cần allowance).
- Xử lý wrong chain: hiện nút Switch Network.
- Persist giao dịch vào bảng `transactions` (pending → confirmed/failed).
- Nút refresh trạng thái nếu giao dịch đang pending.

### 5. Sửa `src/components/wallet/WalletCenterContainer.tsx`
- Thay `onSwap={() => window.open('https://pancakeswap.finance/swap', '_blank')}` → `onSwap={() => setShowSwap(true)}`.
- Thêm state `showSwap` + Dialog chứa `SwapTab`.
- Import `SwapTab` component.

## Chi tiết kỹ thuật

### Token Address Mapping
Sẽ tạo helper `TOKEN_META` từ `WALLET_TOKENS` để tương thích với code swap:
```text
BNB  → native (0xeee...)
USDT → 0x55d398326f99059fF775485246999027B3197955
BTCB → 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c
CAMLY → 0x0910320181889feFDE0BB1Ca63962b0A8882e413
FUN  → disabled (testnet only)
```

### PancakeSwap Router V2
- Address: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- WBNB: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
- ABI: `getAmountsOut`, `swapExactETHForTokens`, `swapExactTokensForETH`, `swapExactTokensForTokens`

### Secret cần thêm
- `ZEROX_API_KEY` — key cho 0x API (cần hỏi user). Nếu không có, swap BNB↔USDT↔BTCB sẽ bị rate limit nhưng vẫn hoạt động. CAMLY swap qua PancakeSwap không cần key.

### Database
Bảng `transactions` đã có sẵn với đủ columns cần thiết — không cần migration.

## Tổng cộng: 3 file mới + 1 file sửa + 1 edge function mới
- `src/config/swap.ts` (MỚI)
- `src/modules/wallet/services/swapAsset.ts` (MỚI)  
- `src/components/wallet/SwapTab.tsx` (MỚI)
- `supabase/functions/swap-quote/index.ts` (MỚI)
- `src/components/wallet/WalletCenterContainer.tsx` (SỬA — thay link ngoài bằng dialog swap)

