

# Sửa hiển thị "Mạng: BSC" thành "Bitcoin Network" khi gửi BTC

## Nguyên nhân

3 file hiển thị biên nhận đang hardcode tên mạng là "BSC", không kiểm tra loại token:

| File | Dòng | Hiện tại | Cần sửa |
|------|------|----------|---------|
| `DonationReceivedCard.tsx` | 217 | Hardcode `BSC` | Kiểm tra `tokenSymbol` |
| `GiftCelebrationModal.tsx` | 378 | Hardcode `BSC (BNB Smart Chain)` | Kiểm tra `tokenSymbol` |
| `DonationSuccessCard.tsx` | 259 | ✅ Đã đúng — có check `BTC` | Không cần sửa |

## Thay đổi

### File 1: `src/components/donations/DonationReceivedCard.tsx` (dòng 217)

```tsx
// Trước
<span className="text-xs font-bold" style={{ color: '#064e3b' }}>BSC</span>

// Sau
<span className="text-xs font-bold" style={{ color: '#064e3b' }}>
  {data.tokenSymbol === 'BTC' ? 'Bitcoin Network' : 'BSC'}
</span>
```

### File 2: `src/components/donations/GiftCelebrationModal.tsx` (dòng 378)

```tsx
// Trước
<span className={`${selectedTheme.textColor} text-sm`}>BSC (BNB Smart Chain)</span>

// Sau
<span className={`${selectedTheme.textColor} text-sm`}>
  {data.tokenSymbol === 'BTC' ? 'Bitcoin Network' : 'BSC (BNB Smart Chain)'}
</span>
```

## Tác động

- Chỉ thay đổi 2 dòng hiển thị text
- Logic TX Hash link đã đúng (đã redirect sang `mempool.space` cho BTC)
- `DonationSuccessCard` đã xử lý đúng, không cần sửa

