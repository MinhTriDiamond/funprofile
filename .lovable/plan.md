

## Thêm nhiều đồng CAMLY coin vào Gift Celebration Card

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`**

Tăng từ **8 coin → 16 coin**, rải đều hơn khắp card với kích thước và animation đa dạng:

```ts
const FLOATING_COINS = [
  // Hàng trên
  { top: '5%', left: '3%', size: 18, delay: '0s', anim: 'animate-float-coin' },
  { top: '8%', left: '25%', size: 14, delay: '0.7s', anim: 'animate-sparkle-coin' },
  { top: '3%', left: '50%', size: 20, delay: '1.3s', anim: 'animate-float-coin' },
  { top: '10%', right: '8%', size: 24, delay: '0.5s', anim: 'animate-sparkle-coin' },
  // Hàng giữa trên
  { top: '25%', left: '8%', size: 16, delay: '1.8s', anim: 'animate-sparkle-coin' },
  { top: '30%', left: '40%', size: 12, delay: '0.3s', anim: 'animate-float-coin' },
  { top: '28%', right: '5%', size: 22, delay: '2.2s', anim: 'animate-float-coin' },
  // Hàng giữa
  { top: '45%', left: '3%', size: 16, delay: '1s', anim: 'animate-float-coin' },
  { top: '50%', left: '60%', size: 14, delay: '1.5s', anim: 'animate-sparkle-coin' },
  { top: '48%', right: '10%', size: 18, delay: '0.2s', anim: 'animate-float-coin' },
  // Hàng giữa dưới
  { top: '60%', left: '15%', size: 20, delay: '1.2s', anim: 'animate-sparkle-coin' },
  { top: '65%', left: '75%', size: 16, delay: '2s', anim: 'animate-float-coin' },
  // Hàng dưới
  { top: '75%', left: '5%', size: 18, delay: '0.8s', anim: 'animate-float-coin' },
  { top: '78%', left: '35%', size: 22, delay: '1.6s', anim: 'animate-sparkle-coin' },
  { top: '80%', right: '12%', size: 26, delay: '2s', anim: 'animate-sparkle-coin' },
  { top: '85%', left: '55%', size: 14, delay: '0.4s', anim: 'animate-float-coin' },
];
```

### Kết quả
- Gấp đôi số coin (8 → 16), rải đều khắp card
- Nhiều kích thước và timing khác nhau, nhìn tự nhiên và lấp lánh hơn
- Chỉ sửa mảng `FLOATING_COINS`, không đụng gì khác

