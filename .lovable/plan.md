

# Tăng kích cỡ logo BTCB và BTC trong bảng Lịch sử giao dịch

## Phân tích

Hiện tại, component `TokenLogo` trong cả 2 file đều dùng class `w-4 h-4` (16px) cho tất cả token. Logo BTCB và BTC có padding bên trong ảnh lớn hơn các token khác nên trông nhỏ hơn.

## Thay đổi

### 1. File: `src/components/wallet/tabs/HistoryTab.tsx` (dòng 79-83)

Cập nhật `TokenLogo` để tăng kích cỡ riêng cho BTCB (+30%) và BTC (x2):

```tsx
function TokenLogo({ symbol }: { symbol: string }) {
  const token = WALLET_TOKENS.find(t => t.symbol === symbol);
  if (!token) return <span className="text-[10px] font-bold text-muted-foreground">{symbol}</span>;
  const sizeClass = symbol === 'BTC' ? 'w-8 h-8' : symbol === 'BTCB' ? 'w-[1.35rem] h-[1.35rem]' : 'w-4 h-4';
  return <img src={token.logo} alt={symbol} className={`${sizeClass} rounded-full`} />;
}
```

### 2. File: `src/components/profile/WalletTransactionHistory.tsx` (dòng 56-60)

Áp dụng cùng logic tăng kích cỡ cho `TokenLogo` ở trang profile.

## Tác động

- BTCB: từ 16px → ~21px (+30%)
- BTC: từ 16px → 32px (gấp đôi)
- Các token khác: giữ nguyên 16px

