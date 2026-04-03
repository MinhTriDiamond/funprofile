

# Điều chỉnh logo BTCB tròn và ngay hàng trong WalletCard

## Vấn đề
Trong hình, logo BTCB bị cắt hoặc không tròn đều vì kích thước `w-12 h-12` tràn ra ngoài container `w-8 h-8` mà không có `overflow-hidden`. Đồng thời bị lệch so với các đồng khác.

## Thay đổi

### File: `src/components/wallet/WalletCard.tsx` (dòng 258-263)
- Thêm `overflow-hidden` và `rounded-full` vào container để đảm bảo logo luôn tròn
- Tăng container cho BTC/BTCB thành `w-10 h-10` để logo không bị cắt quá nhiều, vẫn giữ alignment

```tsx
<div className={cn(
  "flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden",
  token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-10 h-10" : "w-8 h-8"
)}>
  <img 
    src={token.icon} 
    alt={token.symbol} 
    className={cn("rounded-full", token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-12 h-12" : "w-8 h-8")} 
  />
</div>
```

Container sẽ có kích thước cố định `w-10 h-10` cho BTC/BTCB (hoặc `w-8 h-8` cho token khác), với `overflow-hidden` + `rounded-full` để logo luôn hiển thị tròn đẹp và ngay hàng.

## Kết quả
- Logo BTCB tròn đẹp, không bị méo hay cắt lệch
- Tất cả logo token ngay hàng với nhau

