

# Bổ sung nút retry cho khung BTC trong EVM view

## Hiện trạng

Tất cả 3 tính năng đã hoạt động đầy đủ. Chỉ còn 1 thiếu sót nhỏ: khung BTC trong EVM view (dòng 318-324 của AssetTab.tsx) chưa hiển thị nút "⚠️ Thử lại" khi API lỗi, trong khi Bitcoin view đã có.

## Thay đổi

### File: `src/components/wallet/tabs/AssetTab.tsx` (dòng 319-324)

Thêm nút retry sau số dư BTC trong EVM view:

```tsx
// Hiện tại (dòng 318-324)
<>
  <p className="font-bold text-sm">{formatUsd(btcUsdValue)}</p>
  <p className="text-xs text-muted-foreground">
    {btcBalance.toFixed(8)} BTC
  </p>
</>

// Sửa thành
<>
  <p className="font-bold text-sm">{formatUsd(btcUsdValue)}</p>
  <p className="text-xs text-muted-foreground">
    {btcBalance.toFixed(8)} BTC
  </p>
  {btcError && (
    <button onClick={refetchBtc} className="text-xs text-orange-500 hover:text-orange-600 mt-0.5">
      ⚠️ Thử lại
    </button>
  )}
</>
```

Chỉ thêm 3 dòng. Không ảnh hưởng logic khác.

