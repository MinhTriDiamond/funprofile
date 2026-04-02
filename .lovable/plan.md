

# Tách BTC ra khung riêng bên dưới WalletCard

## Vấn đề
Hiện tại BTC đang nằm chung trong danh sách Tokens của WalletCard (Hình 2). User muốn tách BTC ra thành 1 khung riêng biệt (giống Hình 1 — card có header gradient cam, địa chỉ BTC, số dư) nằm **bên dưới** WalletCard.

## Thay đổi

### `src/components/wallet/tabs/AssetTab.tsx`

1. **Bỏ merge BTC vào token list**: Truyền `tokens` gốc (không có BTC) và `totalUsdValue` gốc vào `WalletCard` thay vì `mergedTokens`/`mergedTotalUsd`

2. **Thêm khung BTC riêng bên dưới WalletCard** (trong return EVM, sau `<WalletCard />`): Sử dụng lại đúng layout của block Bitcoin đã có ở `selectedNetwork === 'bitcoin'` (dòng 106-189) — card với:
   - Header gradient cam + logo BTC + text "BTC"
   - Dòng địa chỉ BTC rút gọn + nút Copy + nút External Link
   - Nếu chưa có btcAddress → hiển thị "Chưa liên kết" + nút thêm
   - Row số dư BTC: logo, % thay đổi 24h, giá USD, số lượng BTC

3. **Chỉ hiển thị khung BTC khi có `btcAddress`** hoặc luôn hiển thị với prompt thêm địa chỉ

## Kết quả
- WalletCard chỉ chứa các token EVM (BNB, USDT, BTCB, CAMLY, FUN)
- Bên dưới WalletCard là khung BTC riêng biệt với header cam, địa chỉ, số dư — giống Hình 1

