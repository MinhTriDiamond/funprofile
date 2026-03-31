

## Tăng ánh sáng vàng kim lấp lánh cho đồng tiền

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`** (dòng 278-298)

Thêm các **vòng sáng vàng kim (golden glow rings)** phía sau mỗi đồng tiền, tạo hiệu ứng hào quang lấp lánh:

1. **Wrap mỗi coin trong `<div>` có pseudo-element glow** — thêm một `<div>` nền gradient radial vàng kim phía sau mỗi `<img>` coin, tạo hiệu ứng ánh sáng tỏa ra xung quanh
2. **Tăng cường filter cho cả 2 loại coin**:
   - CAMLY: `brightness(1.5)` + `drop-shadow` glow vàng mạnh hơn (12px, 24px)
   - FUN MONEY: `brightness(1.2)` + `drop-shadow` glow vàng (8px, 16px) — hiện tại FUN MONEY glow yếu, sẽ tăng lên
3. **Thêm vòng sáng nền** cho mỗi coin: một `<span>` tròn với `background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)` kích thước gấp 2.5x coin, đặt phía sau, animation `animate-glow-pulse`

### Cụ thể render mỗi coin sẽ thành:
```tsx
<div key={i} className={`absolute ${coin.anim}`} style={{ top, left, right, animationDelay }}>
  {/* Golden glow ring behind coin */}
  <span className="absolute inset-0 -m-[60%] rounded-full animate-glow-pulse"
    style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,200,0,0.2) 40%, transparent 70%)' }} />
  <img src={...} style={{ filter: '...stronger glow...' }} />
</div>
```

### Kết quả
- Mỗi đồng tiền sẽ có **hào quang vàng kim tỏa sáng** xung quanh
- Ánh sáng **nhấp nháy theo animation glow-pulse** đã có sẵn
- Cả CAMLY và FUN MONEY đều **sáng rực rỡ hơn**
- Chỉ sửa 1 file `GiftCelebrationCard.tsx`

