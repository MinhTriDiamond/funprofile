

# Sửa hiển thị số lượng BTC "0" thành "0,0001" trong bước xác nhận gửi quà

## Vấn đề
Trong `GiftConfirmStep.tsx` (dòng 108), số lượng BTC hiển thị bằng `Number(amount).toLocaleString()`. Với giá trị nhỏ như `0.0001`, hàm `toLocaleString()` mặc định làm tròn thành `"0"` vì không chỉ định số chữ số thập phân.

## Thay đổi

### File: `src/components/donations/gift-dialog/GiftConfirmStep.tsx`
Thay `Number(amount).toLocaleString()` bằng cách thêm `maximumFractionDigits: 8` để hiển thị đầy đủ số thập phân cho BTC:

**Dòng 107-108** (hiển thị số lượng chính):
```tsx
// Hiện tại
Number(amount).toLocaleString()

// Sửa thành
Number(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })
```

**Dòng 112** (hiển thị tổng cho multi-mode):
```tsx
// Hiện tại
totalAmount.toLocaleString()

// Sửa thành  
totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })
```

**Dòng 126** (label recipients):
```tsx
// Hiện tại
Number(amount).toLocaleString()

// Sửa thành
Number(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })
```

## Kết quả
Oval trong bước xác nhận sẽ hiển thị `0,0001 BTC` thay vì `0 BTC`, khớp với thẻ chúc mừng ở Hình 2.

