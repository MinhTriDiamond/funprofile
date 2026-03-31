

## Tăng độ sáng đồng CAMLY coin

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`** (dòng 284-292)

- Tăng `opacity` cho CAMLY coin (index chẵn) sáng hơn FUN MONEY coin
- Tăng cường `drop-shadow` cho CAMLY coin: từ `drop-shadow(0 0 4px rgba(255,215,0,0.6))` → `drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 0 16px rgba(255,215,0,0.5))`
- Thêm `brightness(1.3)` vào filter cho CAMLY coin để sáng rực hơn

Cụ thể, sửa phần render coin:
```tsx
style={{
  ...
  filter: i % 2 === 0
    ? 'brightness(1.3) drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 0 16px rgba(255,215,0,0.5))'
    : 'drop-shadow(0 0 4px rgba(255,215,0,0.6))',
}}
```

### Kết quả
- Đồng CAMLY sáng rực, phát sáng vàng gold mạnh hơn
- Đồng FUN MONEY giữ nguyên
- Chỉ sửa 1 dòng filter

