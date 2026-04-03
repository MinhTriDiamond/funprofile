

# Tăng kích cỡ logo BTC trong danh sách Tokens (WalletCard)

## Vấn đề
Trong danh sách token bên trái (Hình 1), logo BTC nhỏ hơn các đồng còn lại (BNB, USDT, BTCB, CAMLY, FUN) vì file ảnh BTC có padding bên trong.

## Thay đổi

### File: `src/components/wallet/WalletCard.tsx` (dòng 261)
- Logo BTC: `w-10 h-10` → `w-12 h-12` để cân xứng thị giác với các token khác (`w-8 h-8`)

## Kết quả
Logo BTC trong danh sách Tokens sẽ to hơn, cân xứng với BNB, USDT, BTCB, CAMLY, FUN.

