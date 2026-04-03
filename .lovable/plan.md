

# Căn chỉnh logo BTC/BTCB ngay hàng với các token khác

## Vấn đề
Logo BTC và BTCB dùng `w-12 h-12` (48px) trong khi các token khác dùng `w-8 h-8` (32px). Vì logo to hơn nhưng không có container cố định, nó bị lệch sang phải so với các đồng còn lại.

## Thay đổi

### File: `src/components/wallet/WalletCard.tsx` (dòng 258-262)
Bọc logo trong một container cố định `w-8 h-8` cho tất cả token, và cho phép BTC/BTCB overflow ra ngoài container bằng `overflow-visible`:

```tsx
<div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
  <img 
    src={token.icon} 
    alt={token.symbol} 
    className={cn("rounded-full", token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-12 h-12" : "w-8 h-8")} 
  />
</div>
```

Tất cả logo sẽ căn giữa trong cùng một container `w-8`, giữ alignment nhất quán. BTC/BTCB vẫn to hơn nhưng sẽ căn giữa đúng vị trí.

## Kết quả
Logo BTC ngay hàng với BNB, USDT, CAMLY, FUN — đẹp mắt và gọn gàng hơn.

