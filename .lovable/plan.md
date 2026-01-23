
# Kế hoạch: Cập nhật Bảng Danh Dự với style đậm và nổi bật hơn

## Yêu cầu từ Con

1. **Màu nền xanh đậm hơn** - Hiện tại đang dùng `from-primary via-green-400 to-primary`
2. **Chữ vàng Gold sáng và sang hơn** - Làm nổi bật chữ và số
3. **Kích thước chữ và số to hơn** - Dễ đọc, rõ ràng
4. **Viền vàng bên ngoài mảnh hơn** - Hiện tại đang dùng `before:p-[3px]`

---

## Thay đổi chi tiết

### File: `src/components/feed/AppHonorBoard.tsx`

| Thuộc tính | Hiện tại | Sau khi sửa |
|------------|----------|-------------|
| Nền gradient | `from-primary via-green-400 to-primary` | `from-[#0d3d1a] via-[#14532d] to-[#0d3d1a]` (xanh đậm hơn) |
| Viền vàng | `before:p-[3px]` | `before:p-[1.5px]` (mảnh hơn) |
| Cỡ chữ label | `text-xs` | `text-sm` |
| Cỡ số value | `text-sm` | `text-base` |
| Font weight | `font-semibold` / `font-bold` | `font-bold` / `font-extrabold` |
| Màu vàng | `#FFD700, #FFC125, #DAA520` | `#FFE55C, #FFD700, #FFBF00` (sáng hơn) |
| Text shadow | `0 0 8px rgba(255,215,0,0.4)` | `0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,215,0,0.3)` (glow mạnh hơn) |
| Padding row | `py-2.5 px-4` | `py-3 px-5` (rộng hơn cho chữ to) |
| Container border | `border-2 border-gold` | `border border-gold/80` (mảnh hơn) |

---

## Code thay đổi chính

### 1. Container ngoài (dòng 183)
```tsx
// TRƯỚC
<div className="rounded-2xl overflow-hidden border-2 border-gold bg-transparent shadow-gold-glow">

// SAU
<div className="rounded-2xl overflow-hidden border border-[#C9A84C]/70 bg-transparent shadow-gold-glow">
```

### 2. Mỗi stat row (dòng 221-244 và 248-270)
```tsx
// TRƯỚC
className="... bg-gradient-to-r from-primary via-green-400 to-primary ... before:p-[3px] ..."

// SAU  
className="... bg-gradient-to-r from-[#0d3d1a] via-[#14532d] to-[#0d3d1a] ... before:p-[1.5px] ..."
```

### 3. Label text (dòng 229, 257)
```tsx
// TRƯỚC
<p className="text-xs uppercase font-semibold whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFC125] to-[#DAA520]" style={{ textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>

// SAU
<p className="text-sm uppercase font-bold whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFBF00]" style={{ textShadow: '0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,215,0,0.3)' }}>
```

### 4. Value số (dòng 232, 260)
```tsx
// TRƯỚC
<p className="font-bold text-sm flex items-center gap-1 shrink-0 text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FFC125] to-[#DAA520]" style={{ textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>

// SAU
<p className="font-extrabold text-base flex items-center gap-1 shrink-0 text-transparent bg-clip-text bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFBF00]" style={{ textShadow: '0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,215,0,0.3)' }}>
```

### 5. Padding row
```tsx
// TRƯỚC
py-2.5 px-4

// SAU
py-3 px-5
```

---

## Tóm tắt thay đổi

| Mục | Chi tiết |
|-----|----------|
| File cần sửa | `src/components/feed/AppHonorBoard.tsx` |
| Số dòng thay đổi | ~10 dòng |
| Kết quả | Nền xanh đậm hơn, chữ vàng sáng nổi bật, font to rõ ràng, viền mảnh tinh tế |

---

## Kết quả mong đợi

Sau khi sửa, Bảng Danh Dự sẽ có:
- **Nền xanh rừng đậm** (`#0d3d1a` → `#14532d`) tạo sự tương phản cao
- **Chữ vàng Gold sáng rực** với gradient `#FFE55C` → `#FFBF00` và glow effect mạnh
- **Font size lớn hơn** (`text-sm` label, `text-base` số) dễ đọc
- **Viền vàng mảnh 1.5px** tinh tế, sang trọng
