
# Lam nut Angel AI co the keo tha (draggable) tren mobile va iPad

## Muc tieu
Cho phep nguoi dung keo tha nut Angel AI den bat ky vi tri nao tren man hinh o che do mobile va tablet. Vi tri se duoc luu vao localStorage de giu nguyen khi quay lai.

## Cach thuc hien

### Sua file `src/components/angel-ai/AngelFloatingButton.tsx`

Them logic touch drag vao component:

1. **State moi**: `position` (x, y) luu vi tri hien tai cua nut, `isDragging` de phan biet giua keo va click.

2. **Touch events**:
   - `onTouchStart`: ghi nhan vi tri bat dau cham va offset giua ngon tay va nut
   - `onTouchMove`: cap nhat vi tri nut theo ngon tay, gioi han trong viewport (khong cho keo ra ngoai man hinh)
   - `onTouchEnd`: neu khoang cach di chuyen nho (duoi 10px) thi coi nhu click (mo chat), neu lon hon thi coi nhu keo tha va luu vi tri vao `localStorage`

3. **Vi tri mac dinh**: `bottom: 96px, right: 16px` (giong hien tai). Khi co vi tri luu trong localStorage thi dung vi tri do.

4. **Style thay doi**: Chuyen tu dung Tailwind `fixed bottom-24 right-4` sang inline style `position: fixed; left: Xpx; top: Ypx` de ho tro vi tri dong.

5. **Snap to edge (tuy chon)**: Khi tha nut, tu dong dich nut ve canh trai hoac phai gan nhat de giao dien gon gang hon.

## Chi tiet ky thuat

| File | Thay doi |
|------|---------|
| `src/components/angel-ai/AngelFloatingButton.tsx` | Them touch drag logic, luu vi tri vao localStorage, chuyen sang inline position |

Chi sua 1 file duy nhat. Khong can them thu vien nao moi.
