
# Sửa hiển thị số lượng BTC = 0 trên Biên Nhận Tặng (phía người nhận)

## Nguyên nhân

Dòng 195 trong `DonationReceivedCard.tsx` dùng `Number(data.amount).toLocaleString(numLocale)` **không có tùy chọn số thập phân**. Với locale `vi-VN`, số nhỏ như `0.0001` bị làm tròn thành `"0"`.

Trong khi đó, `DonationSuccessCard.tsx` (phía người gửi) đã dùng đúng: `maximumFractionDigits: 8` → hiển thị `0,0001`.

## Thay đổi

### File: `src/components/donations/DonationReceivedCard.tsx` (dòng 195)

```tsx
// Hiện tại
{Number(data.amount).toLocaleString(numLocale)} {data.tokenSymbol}

// Sửa thành
{Number(data.amount).toLocaleString(numLocale, { minimumFractionDigits: 0, maximumFractionDigits: 8 })} {data.tokenSymbol}
```

Chỉ thêm options cho `toLocaleString` — giống hệt cách `DonationSuccessCard` đang làm. Số `0.0001` sẽ hiển thị đúng `0,0001` (vi-VN) hoặc `0.0001` (en-US).
