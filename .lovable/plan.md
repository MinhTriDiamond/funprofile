

# Bổ sung BTC vào Token Selector + Tăng kích thước logo BTC trong Network Selector

## Thay đổi

### 1) `src/components/donations/TokenSelector.tsx`
- Import `btcLogo` từ `@/assets/tokens/btc-logo.png`
- Thêm BTC vào mảng `SUPPORTED_TOKENS`:
  ```
  { symbol: 'BTC', name: 'Bitcoin', address: null, decimals: 8, logo: btcLogo, color: 'from-orange-500 to-amber-400' }
  ```

### 2) `src/components/donations/NetworkSelector.tsx`
- Tăng kích thước logo BTC từ `w-5 h-5` lên `w-8 h-8` (tăng ~50%)
- Áp dụng riêng cho BTC bằng cách thêm điều kiện kích thước theo `chainId === BTC_MAINNET`, hoặc thêm thuộc tính `logoSize` vào config NETWORKS

### 3) `src/lib/tokens.ts`
- Đảm bảo token BTC đã có trong `WALLET_TOKENS` (đã có sẵn — không cần sửa)

## Kết quả
- Mục "Chọn token" hiển thị thêm nút BTC với logo cam chính thức, bên cạnh FUN/CAMLY/BNB/USDT/BTCB
- Logo BTC trong "Chọn mạng" to hơn 50%

