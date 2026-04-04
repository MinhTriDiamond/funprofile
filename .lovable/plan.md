

# Sửa hiển thị số dư BTC thập phân và đồng bộ gửi/nhận BTC

## Vấn đề phát hiện

### 1. Input số lượng BTC bị parse sai
Khi người dùng nhập `0000001` vào ô "Số lượng", `parseFloat("0000001")` trả về **1** (một BTC), không phải `0.0000001`. Đây là nguyên nhân hiển thị "cần 1 BTC" và "≈ $66,828 USD".

### 2. Số dư BTC hiển thị "0" thay vì "0.00000000"
Dòng 264 trong `GiftFormStep.tsx` dùng `formattedBalance.toLocaleString(undefined, { maximumFractionDigits: selectedToken.decimals })`. Khi giá trị = 0 và không có `minimumFractionDigits`, locale format bỏ hết số thập phân → hiện "0" thay vì "0.00000000".

### 3. BtcSendDialog cũng cần cải thiện tương tự

## Kế hoạch sửa

### File 1: `src/components/donations/gift-dialog/GiftFormStep.tsx`

**Sửa hiển thị số dư (dòng 264):**
- Thêm `minimumFractionDigits` cho BTC: khi token là BTC, hiển thị tối thiểu 8 chữ số thập phân
- `formattedBalance.toLocaleString(undefined, { minimumFractionDigits: isBtc ? 8 : 0, maximumFractionDigits: selectedToken.decimals })`

### File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`

**Sửa logic parse amount (dòng 198):**
- Thêm hàm `sanitizeAmount()` để xử lý leading zeros:
  - `"0000001"` → `"0.0000001"` (tự động chèn dấu chấm)
  - `"00.5"` → `"0.5"`
  - Input bình thường giữ nguyên

**Cập nhật `onAmountChange` handler:**
- Khi `selectedChainId === BTC_MAINNET`, áp dụng sanitize trước khi `setAmount()`

### File 3: `src/components/wallet/BtcSendDialog.tsx`

**Sửa hiển thị số dư (dòng 72):**
- Đổi `balance.toFixed(8)` → giữ nguyên (đã đúng)
- Sửa input amount: thêm cùng logic sanitize leading zeros

### File 4: `src/components/donations/TokenSelector.tsx`
- Không cần sửa (BTC decimals = 8 đã đúng)

## Chi tiết kỹ thuật — Logic sanitize amount

```typescript
function sanitizeAmountInput(raw: string, isBtc: boolean): string {
  let v = raw.replace(/[^0-9.]/g, '');
  // Chỉ cho phép 1 dấu chấm
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  // Xử lý leading zeros: "0000001" → "0.0000001"
  if (isBtc && v.length > 1 && v[0] === '0' && v[1] !== '.') {
    v = '0.' + v.slice(1);
  }
  return v;
}
```

## Kết quả mong đợi
- Nhập `0000001` với BTC → tự động thành `0.0000001` BTC (≈ $0.0067 USD)
- Số dư BTC = 0 → hiển thị `0.00000000 BTC` thay vì `0 BTC`
- Đồng bộ giữa desktop và mobile: cùng logic hiển thị và nhập liệu

