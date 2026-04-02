

# Đưa BTC vào danh sách token chung trong WalletCard

## Vấn đề
Hiện tại BTC hiển thị riêng thành 1 card tách biệt bên dưới WalletCard (Hình 1). User muốn BTC nằm **chung** trong danh sách Tokens của WalletCard (Hình 2), vị trí **sau FUN** (cuối danh sách), hiển thị số dư + mệnh giá USD giống Hình 3.

## Thay đổi

### 1) `src/components/wallet/tabs/AssetTab.tsx`
- **Xóa** toàn bộ card BTC riêng biệt (block `border-orange-200` ở cuối return EVM, dòng ~214-263)
- Tạo 1 object BTC token từ `useBtcBalance` + `prices`, có cấu trúc giống `TokenBalance`: `{ symbol: 'BTC', icon: btcLogo, balance: btcBalance, usdValue: btcUsdValue, change24h: btcChange, isLoading: isBtcBalanceLoading }`
- Ghép BTC token vào cuối mảng `tokens` trước khi truyền vào `WalletCard`: `[...tokens, btcTokenObj]`
- Cập nhật `totalUsdValue` thêm `btcUsdValue`

### 2) Không cần sửa `WalletCard.tsx`
- WalletCard đã render token list động từ `tokens.map()` — chỉ cần truyền thêm BTC vào mảng là tự hiển thị đúng format (logo, %, USD, balance)

## Kết quả
- BTC hiển thị trong cùng danh sách Tokens, nằm dưới FUN
- Hiển thị số dư BTC thực (từ Mempool.space) + giá USD real-time + % thay đổi 24h
- Tổng tài sản (Total Assets) bao gồm luôn giá trị BTC

