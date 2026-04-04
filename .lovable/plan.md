

# Chỉnh logo token thẳng hàng trong bảng lịch sử giao dịch

## Vấn đề

Các logo token có kích thước khác nhau (BTC = 32px, BTCB = 21.6px, còn lại = 16px), khiến chúng không thẳng hàng trong bảng.

## Giải pháp

Đặt tất cả logo cùng một kích thước cố định trong bảng SummaryTable, và dùng một container có chiều rộng cố định để căn giữa logo, đảm bảo thẳng hàng.

### Thay đổi

**2 file** — cùng logic `TokenLogo`:

1. `src/components/wallet/tabs/HistoryTab.tsx` (dòng 79-84)
2. `src/components/profile/WalletTransactionHistory.tsx` (dòng 56-61)

Sửa `TokenLogo` để tất cả logo có cùng kích thước `w-6 h-6` (24px) — đủ rõ, đồng đều:

```tsx
function TokenLogo({ symbol }: { symbol: string }) {
  const token = WALLET_TOKENS.find(t => t.symbol === symbol);
  if (!token) return <span className="text-[10px] font-bold text-muted-foreground">{symbol}</span>;
  return <img src={token.logo} alt={symbol} className="w-6 h-6 rounded-full" />;
}
```

## Kết quả

Tất cả logo (USDT, BNB, BTCB, BTC, FUN, CAMLY) sẽ có cùng kích thước 24×24px, thẳng hàng từ trên xuống dưới trong bảng tổng hợp.

