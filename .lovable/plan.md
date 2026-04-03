

# Tăng kích cỡ logo BTC bằng BTCB trong TokenSelector

## Vấn đề
Logo BTC và BTCB cùng dùng `w-12 h-12`, nhưng file ảnh BTC có padding nhiều hơn nên trông nhỏ hơn BTCB.

## Thay đổi

### File: `src/components/donations/TokenSelector.tsx` (dòng 101)
```tsx
// Hiện tại
token.symbol === 'BTC' || token.symbol === 'BTCB' ? "w-12 h-12" : "w-10 h-10"

// Sửa thành
token.symbol === 'BTC' ? "w-14 h-14" : token.symbol === 'BTCB' ? "w-12 h-12" : "w-10 h-10"
```

BTC sẽ dùng `w-14 h-14` để bù padding, BTCB giữ nguyên `w-12 h-12`.

## Kết quả
Logo BTC sẽ hiển thị to bằng BTCB, cân xứng thị giác.

