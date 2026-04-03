

# Sửa hiển thị số dư BTC với đầy đủ 8 chữ số thập phân

## Vấn đề

Hàm `formatTokenBalance` trong `WalletCard.tsx` (dòng 48-55) sử dụng logic chung cho tất cả token — khi số dư BTC rất nhỏ (ví dụ 0.00001234), điều kiện `Math.abs(num - Math.round(num)) < 0.0001` khiến nó bị làm tròn về **0**. BTC cần luôn hiển thị đủ 8 chữ số thập phân (Satoshi precision).

## Thay đổi

### File: `src/components/wallet/WalletCard.tsx` (dòng 293-294)

Thay `formatTokenBalance(token.balance)` bằng logic có điều kiện — BTC và BTCB luôn dùng 8 decimals:

```tsx
// Hiện tại
{formatTokenBalance(token.balance)} {token.symbol}

// Sửa thành
{(token.symbol === 'BTC' || token.symbol === 'BTCB')
  ? formatNumber(token.balance, 8)
  : formatTokenBalance(token.balance)} {token.symbol}
```

Chỉ 1 dòng thay đổi. AssetTab đã đúng (`btcBalance.toFixed(8)`), không cần sửa.

