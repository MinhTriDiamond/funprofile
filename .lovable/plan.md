
# Kế Hoạch: Hiển Thị Hoa Mai/Hoa Đào Rõ Ràng Trên Mobile

## Phân Tích Vấn Đề Từ Screenshot

Nhìn vào hình con chụp, Cha thấy:
- ✅ Video đã được load (thấy 1 cánh hoa nhỏ góc trái)
- ❌ Hoa mai/đào bị che gần như hoàn toàn bởi nội dung
- ❌ Cards chiếm toàn bộ chiều rộng màn hình, không còn khoảng trống ở 2 bên

### Nguyên Nhân Chính

1. **Feed content chiếm full width** - Trên mobile, nội dung feed mở rộng từ mép trái đến mép phải màn hình
2. **Không có margin ở 2 bên** - `px-4` chỉ là padding nhỏ, không đủ để hoa mai/đào hiển thị
3. **Cards có opacity 80%** - Vẫn còn đậm, nhưng quan trọng hơn là chúng che hết không gian

---

## Giải Pháp Đề Xuất

### Phương án 1: Thêm Gradient Fade Ở Hai Bên (Được Đề Xuất)
Tạo hiệu ứng gradient mờ dần ở 2 bên màn hình để hoa mai/đào "xuyên thấu" vào nội dung một cách tự nhiên.

```css
/* Gradient fade overlay ở 2 bên */
.tet-side-gradient::before,
.tet-side-gradient::after {
  content: '';
  position: fixed;
  top: 0;
  bottom: 0;
  width: 40px;
  pointer-events: none;
  z-index: 1;
}
.tet-side-gradient::before {
  left: 0;
  background: linear-gradient(to right, transparent 0%, hsl(var(--background)/0.9) 100%);
}
.tet-side-gradient::after {
  right: 0;
  background: linear-gradient(to left, transparent 0%, hsl(var(--background)/0.9) 100%);
}
```

### Phương án 2: Thêm Margin Ở Hai Bên Cho Mobile
Để lại khoảng trống 20-30px ở mỗi bên để hoa hiển thị.

### Phương án 3: Giảm Opacity Cards + Rounded Corners Lớn Hơn
Giảm `bg-card/80` xuống `bg-card/70` và tăng border-radius để hoa hiển thị qua các góc.

---

## Kế Hoạch Triển Khai Chi Tiết

### Bước 1: Tạo Decorative Flower Overlay Component
Thêm 2 lớp hình ảnh hoa mai/đào tĩnh ở 2 góc dưới màn hình (fixed position) để luôn hiển thị rõ ràng ngay cả khi video bị che.

**File mới:** `src/components/ui/TetFlowerOverlay.tsx`

```tsx
/**
 * Hoa mai/đào trang trí cố định ở 2 góc màn hình
 * Hiển thị rõ ràng trên cả desktop và mobile
 */
export const TetFlowerOverlay = memo(() => {
  return (
    <>
      {/* Hoa mai góc trái dưới */}
      <div 
        className="fixed bottom-20 left-0 w-32 h-40 pointer-events-none z-10 opacity-80"
        style={{
          backgroundImage: 'url(/tet-flower-left.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom left',
        }}
      />
      {/* Hoa đào góc phải dưới */}
      <div 
        className="fixed bottom-20 right-0 w-32 h-40 pointer-events-none z-10 opacity-80"
        style={{
          backgroundImage: 'url(/tet-flower-right.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom right',
        }}
      />
    </>
  );
});
```

### Bước 2: Cải Thiện TetBackground Video Positioning
Điều chỉnh video để hoa hiển thị rõ hơn ở các góc.

**File:** `src/components/ui/TetBackground.tsx`

```tsx
// Thêm scale lớn hơn để hoa ở các góc không bị cắt
className="absolute top-0 left-1/2 w-auto h-auto -translate-x-1/2 object-cover"
style={{
  transform: 'translateX(-50%) scale(1.1)',
  filter: 'saturate(1.2) contrast(1.1) brightness(1.05)',
}}
```

### Bước 3: Giảm Opacity Cards Trên Mobile
Giảm độ đậm của cards để video xuyên thấu tốt hơn.

**File:** `src/index.css`

```css
/* Mobile: Cards trong suốt hơn để hoa mai/đào hiển thị */
@media (max-width: 768px) {
  .fb-card {
    @apply bg-card/70;
  }
}
```

### Bước 4: Thêm Margin Nhỏ Ở Hai Bên Mobile Feed
Để lại khoảng trống 8-12px ở 2 bên để hoa hiển thị.

**File:** `src/pages/Feed.tsx`

```tsx
// Thay đổi padding để để lại khoảng trống cho hoa
<div className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-[2cm]">
```

---

## Tổng Kết Các File Cần Sửa

| File | Thay Đổi | Mức Độ |
|------|----------|--------|
| `src/components/ui/TetBackground.tsx` | Tối ưu scale + filter video | Nhẹ |
| `src/components/ui/TetFlowerOverlay.tsx` | **Tạo mới** - Hoa trang trí cố định | Trung bình |
| `src/index.css` | Giảm opacity cards trên mobile | Nhẹ |
| `src/pages/Feed.tsx` | Thêm padding 2 bên | Nhẹ |
| `src/App.tsx` | Import TetFlowerOverlay | Nhẹ |

---

## Kết Quả Mong Đợi

Sau khi áp dụng các thay đổi:

1. **Hoa mai/hoa đào** hiển thị rõ ràng ở **2 góc dưới** màn hình mobile
2. **Video nền** tiếp tục chạy phía sau với hoa mai/đào động
3. **Hoa tĩnh** (overlay) đảm bảo luôn có hoa hiển thị ngay cả khi video bị che
4. **Nội dung vẫn dễ đọc** - chỉ giảm nhẹ opacity, không ảnh hưởng UX
5. **Không khí Tết** tràn ngập toàn ứng dụng

---

## Lưu Ý Quan Trọng

- **Không cần thêm hình ảnh hoa** nếu con muốn - Cha có thể chỉ tối ưu video hiện có
- Nếu video hiện tại không có hoa ở vị trí phù hợp, có thể cần **thay video** hoặc **thêm hình tĩnh**
- Cha sẽ kiểm tra xem video hiện tại có hoa ở đâu trước khi triển khai
