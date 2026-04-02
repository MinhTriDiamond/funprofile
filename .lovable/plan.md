

# Sửa hiển thị số BTC nhỏ trên biên nhận tặng quà

## Nguyên nhân
Dòng 216 trong `DonationSuccessCard.tsx` dùng `Number(data.amount).toLocaleString(numLocale)` — mặc định `toLocaleString` chỉ hiển thị tối đa 3 chữ số thập phân → `0.00004` bị làm tròn thành `0`.

## Thay đổi

### `src/components/donations/DonationSuccessCard.tsx` (dòng 216)

Thay:
```typescript
{Number(data.amount).toLocaleString(numLocale)} {data.tokenSymbol}
```

Bằng logic tự động xác định số chữ số thập phân cần thiết:
```typescript
{Number(data.amount).toLocaleString(numLocale, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})} {data.tokenSymbol}
```

Dùng `maximumFractionDigits: 8` vì BTC có tối đa 8 chữ số thập phân (satoshi). Các token EVM như CAMLY, FUN vẫn hiển thị bình thường vì giá trị thường >= 1.

## Kết quả
- `0.00004 BTC` hiển thị đúng "0,00004 BTC" (tiếng Việt) thay vì "0 BTC"
- Các token khác không bị ảnh hưởng

