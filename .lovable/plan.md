

# Sửa lỗi giá USD cho BTC + Tự động đóng dialog sau khi gửi

## 3 thay đổi

### 1) Sửa `selectedTokenPrice` — hiển thị đúng giá USD cho BTC
**File:** `src/components/donations/UnifiedGiftSendDialog.tsx`

Hiện tại `selectedTokenPrice` chỉ tìm trong `tokenBalanceList` (danh sách EVM tokens) → BTC không có trong list → trả về `null` → hiện lỗi "Chưa xác định được giá trị USD".

**Sửa:** Trong `useMemo` của `selectedTokenPrice` (dòng ~180-183), khi `selectedChainId === BTC_MAINNET`, trả về `prices?.BTC?.usd` từ `useTokenBalances()` (hook đã export `prices` chứa key `BTC`).

```typescript
const selectedTokenPrice = useMemo(() => {
  if (selectedChainId === BTC_MAINNET) {
    return prices?.BTC?.usd ?? 100000;
  }
  const found = tokenBalanceList.find(t => t.symbol === selectedToken.symbol);
  return found?.price ?? null;
}, [tokenBalanceList, selectedToken, selectedChainId, prices]);
```

Cần destructure thêm `prices` từ `useTokenBalances()` (dòng ~96).

### 2) Bỏ qua `minSendValidation` cho BTC
**File:** `src/components/donations/UnifiedGiftSendDialog.tsx`

Thêm điều kiện BTC vào `minSendCheck` (dòng ~188-192) — khi `isBtcNetwork`, bỏ qua validation (giống testnet):

```typescript
const minSendCheck = parsedAmountNum > 0
  ? (selectedChainId === BSC_TESTNET || isBtcNetwork
      ? { valid: true }
      : validateMinSendValue(parsedAmountNum, selectedTokenPrice))
  : { valid: false } as { valid: boolean; message?: string };
```

### 3) Tự động đóng dialog sau khi bấm "Mở ví BTC để gửi"
**File:** `src/components/donations/UnifiedGiftSendDialog.tsx`

Trong callback `onBtcSendDirect` (dòng ~640-647), sau khi `window.open(bip21Url)` và hiện toast, thêm `setTimeout(() => handleDialogClose(), 1500)` để đóng dialog sau 1.5 giây — cho user kịp thấy toast thành công.

## Kết quả
- Chọn BTC → hiển thị đúng giá USD (≈ $X,XXX.XX), không còn lỗi "Chưa xác định"
- Nút "Mở ví BTC để gửi" → mở deep link → tự động đóng dialog → toast hướng dẫn xác nhận trong ví

