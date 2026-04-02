

# Bổ sung mạng BTC vào NetworkSelector + Đổi text/logo

## Thay đổi

### 1) `src/components/donations/NetworkSelector.tsx`
- Thêm BTC vào mảng `NETWORKS`: `{ chainId: BTC_MAINNET (0), label: 'BTC', color: 'from-orange-500 to-amber-400' }`
- Import `BTC_MAINNET` từ `chainTokenMapping` và `btcLogo`
- Hiển thị logo BTC thay vì BNB khi network là BTC
- Import và hiển thị `btcLogo` cho nút BTC

### 2) `src/components/wallet/tabs/AssetTab.tsx`
- Đổi tất cả chỗ `"Bitcoin Network"` → `"BTC"` (2 chỗ: dòng ~81 và ~170)

### 3) Logo BTC
- Logo hiện tại (`btc-logo.png`) đã được thay bằng logo cam chính thức ở bước trước → không cần thay lại

## Kết quả
- Mục "Chọn mạng" có 3 nút: Mainnet / Testnet / BTC (với logo BTC cam)
- Header section Bitcoin trong AssetTab hiển thị "BTC" thay vì "Bitcoin Network"

