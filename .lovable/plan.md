

# Hiển thị số dư BTC theo thời giá + Sửa logo BTC

## Thay đổi

### 1) `supabase/functions/token-prices/index.ts` — Thêm giá BTC
- Thêm `BTC: 'bitcoin'` vào `COINGECKO_IDS` (cùng geckoId với BTCB nhưng key riêng)
- Thêm `BTC` vào `FALLBACK_PRICES`
- Kết quả: API trả về `prices.BTC.usd` và `prices.BTC.usd_24h_change`

### 2) `src/hooks/useBtcBalance.ts` — Hook mới lấy số dư BTC từ Mempool.space
- Nhận `btcAddress` làm tham số
- Gọi `https://mempool.space/api/address/{btcAddress}` để lấy balance (funded - spent)
- Convert satoshi → BTC (chia 100,000,000)
- Trả về `{ balance, isLoading, refetch }`

### 3) `src/components/wallet/tabs/AssetTab.tsx` — Hiển thị BTC trong danh sách token
- Import `useBtcBalance` và lấy giá BTC từ `prices`
- Thêm 1 row BTC vào danh sách token (icon BTC cam, giá, số dư, USD value, % thay đổi 24h) — giống format các token khác (Hình 2)
- **Sửa logo** trong header BTC section: tăng kích thước từ `w-5 h-5` lên `w-7 h-7` để logo hiển thị rõ hơn

### 4) `src/hooks/useTokenBalances.ts` — Thêm fallback price BTC
- Thêm `BTC: { usd: 66000, usd_24h_change: 0 }` vào `fallbackPrices`

### 5) Logo BTC (`src/assets/tokens/btc-logo.png`)
- Kiểm tra file hiện tại, nếu vẫn là logo cũ → thay bằng logo chính thức (nền cam, chữ B trắng) từ hình user upload

## Kết quả
- Trang Ví hiển thị BTC trong danh sách token với số dư thực từ blockchain + giá real-time
- Logo BTC đúng chuẩn (cam, B trắng) ở cả header section và token list

