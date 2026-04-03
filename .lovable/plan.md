

# Tăng kích cỡ logo BTC nhảy múa lên gấp đôi (giữ nguyên CamLy & Fun Money)

## Thay đổi

### File: `src/components/feed/GiftCelebrationCard.tsx` (dòng 296-297)

Thay `coin.size` bằng biểu thức có điều kiện — nhân đôi khi là BTC gift:

```tsx
// Hiện tại
width: coin.size,
height: coin.size,

// Sửa thành
width: isBtcGift ? coin.size * 2 : coin.size,
height: isBtcGift ? coin.size * 2 : coin.size,
```

Chỉ 2 dòng thay đổi. Mảng `FLOATING_COINS` và các token khác không bị ảnh hưởng.

