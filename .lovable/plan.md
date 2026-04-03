

# Tăng kích cỡ logo BTCB trong WalletCard

## Vấn đề
Trong danh sách Tokens ở ví (Hình 1), logo BTCB vẫn dùng `w-8 h-8` — nhỏ hơn BTC (`w-12 h-12`) và không cân xứng thị giác.

## Thay đổi

### File: `src/components/wallet/WalletCard.tsx` (dòng 261)
```tsx
// Hiện tại
token.symbol === 'BTC' ? "w-12 h-12" : "w-8 h-8"

// Sửa thành
token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-12 h-12" : "w-8 h-8"
```

## Kết quả
Logo BTCB trong danh sách Tokens sẽ to bằng BTC, cân xứng với các đồng còn lại (BNB, USDT, CAMLY, FUN).

