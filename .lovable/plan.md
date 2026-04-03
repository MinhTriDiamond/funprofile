

# Hoán đổi kích cỡ logo BTC giữa NetworkSelector và AssetTab

## Vấn đề
- **Hình 1** (NetworkSelector — chọn mạng): Logo BTC quá to (`w-16 h-16`), không cân đối với các nút Mainnet/Testnet
- **Hình 2** (AssetTab — thẻ BTC trong ví): Logo BTC nhỏ hơn (`w-14 h-14`)

User muốn hoán đổi: NetworkSelector logo nhỏ lại, AssetTab logo to lên.

## Thay đổi

### 1) `src/components/donations/NetworkSelector.tsx` (dòng 38)
- BTC logo: `w-16 h-16` → `w-8 h-8` (cân đối với BNB logo `w-5 h-5`, vẫn lớn hơn một chút vì file BTC có padding)

### 2) `src/components/wallet/tabs/AssetTab.tsx` (dòng 107, 228)
- BTC logo header: `w-14 h-14` → `w-16 h-16` (to hơn, nổi bật hơn trong thẻ ví)

## Kết quả
- NetworkSelector: logo BTC nhỏ gọn, cân đối với các nút mạng khác
- AssetTab: logo BTC to hơn, nổi bật trong thẻ ví Bitcoin

