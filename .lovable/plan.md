

# Thiết kế lại màu sắc nền popup chúc mừng — Tươi sáng hơn

## Vấn đề hiện tại
Popup đang dùng tông màu tối (`amber-950/95`, `card/95`) trên nền overlay đen (`bg-black/60`), tạo cảm giác u ám, không phù hợp với không khí chúc mừng.

## Giải pháp

Chuyển sang tông **vàng kem sáng** (warm golden) — tương tự screenshot reference mà con đã gửi:

### Thay đổi trong `EpochClaimCelebration.tsx`

**1. Overlay nền** — giảm tối:
- `bg-black/60` → `bg-black/40`

**2. Card chính** — chuyển sang nền sáng ấm:
- `from-amber-950/95 via-card/95 to-card/95` → `from-amber-50 via-white to-amber-50/95`
- Border: `border-amber-400/50` → `border-amber-300`
- Shadow giữ nguyên gold glow

**3. Text colors** — đổi sang tông tối trên nền sáng:
- Tiêu đề "Chúc mừng!": `text-amber-300` → `text-amber-600`
- Phụ đề: `text-amber-200/80` → `text-amber-700/80`
- Nút close: `text-amber-200/70` → `text-amber-500`

**4. Khu vực tổng phần thưởng** — nền sáng ấm:
- `from-amber-500/10 via-amber-400/20` → `from-amber-100 via-amber-50 to-amber-100`
- Border: `border-amber-400/20` → `border-amber-300/40`
- Label: `text-amber-300/70` → `text-amber-600`
- Số FUN: gradient `from-amber-600 via-orange-500 to-amber-600` (tối trên nền sáng, dễ đọc)

**5. Month breakdown rows**:
- `bg-white/5` → `bg-amber-50/80`
- Text tháng: `text-foreground` → `text-amber-900`
- Số FUN: `text-amber-300` → `text-orange-600`

**6. Hướng dẫn & nút**:
- "Vào Ví → FUN Money": `text-muted-foreground` → `text-amber-700/70`
- Nút "Để sau": `border-amber-400/30 text-amber-200` → `border-amber-400 text-amber-700`
- Nút "Claim ngay!" giữ gradient cam vàng (đã tươi sáng)

**7. Icon header**: vòng tròn PartyPopper giữ gradient vàng-cam, nổi bật trên nền sáng

## File cần sửa
| File | Thay đổi |
|------|----------|
| `src/components/notifications/EpochClaimCelebration.tsx` | Đổi toàn bộ color scheme sang tông sáng ấm |

