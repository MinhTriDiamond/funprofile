

# Tăng kích cỡ logo BTCB và BTC trong TokenSelector

## Vấn đề
Trong hình, logo BTCB và BTC nhỏ hơn các đồng còn lại (FUN, CAMLY, BNB, USDT) vì file ảnh có padding bên trong.

## Thay đổi

### File: `src/components/donations/TokenSelector.tsx` (dòng 99-104)
Thay vì dùng cùng kích thước `w-10 h-10` cho tất cả token, thêm điều kiện: nếu token là `BTCB` hoặc `BTC` thì container dùng `w-12 h-12` để bù padding trong file ảnh.

```tsx
<div className={cn(
  "rounded-full flex items-center justify-center mb-1 overflow-hidden",
  token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-12 h-12" : "w-10 h-10"
)}>
```

## Kết quả
Logo BTCB và BTC sẽ to hơn, cân xứng thị giác với FUN, CAMLY, BNB, USDT.

