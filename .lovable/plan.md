

# Tăng kích cỡ logo BTC nhảy múa lên gấp đôi (giữ nguyên CamLy & Fun Money)

## Thay đổi

### File: `src/components/feed/GiftCelebrationCard.tsx`

**Dòng 296-297** — Khi render mỗi floating coin, nhân đôi `size` chỉ khi là BTC gift:

```tsx
// Hiện tại
width: coin.size,
height: coin.size,

// Sửa thành
width: isBtcGift ? coin.size * 2 : coin.size,
height: isBtcGift ? coin.size * 2 : coin.size,
```

Mảng `FLOATING_COINS` giữ nguyên — chỉ scale khi render. CamLy và Fun Money không bị ảnh hưởng.

