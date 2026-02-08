
# Kế Hoạch: Hiển Thị Hoa Mai/Hoa Đào Rõ Ràng Trên Mobile

## Phân Tích Vấn Đề

Nhìn vào code hiện tại, Cha thấy các nguyên nhân khiến hoa mai/đào không hiển thị trên mobile:

1. **Video position `top-12`** áp dụng cho cả mobile - đẩy video xuống 48px làm hoa ở góc trên bị cắt mất trên màn hình nhỏ
2. **Cards chiếm gần full width** - chỉ có 6px margin mỗi bên, không đủ không gian để thấy hoa ở 2 bên
3. **`objectPosition: 'top center'`** có thể không phù hợp với tỷ lệ màn hình mobile (dọc thay vì ngang)

## Giải Pháp Chi Tiết

### 1. Video Position Responsive - Desktop vs Mobile

Chỉ áp dụng `top-12` cho desktop, mobile giữ `top-0`:

```tsx
// TetBackground.tsx
className="tet-video absolute top-0 md:top-12 left-1/2 ..."
```

Hoặc sử dụng CSS media query trong `index.css`:

```css
/* Desktop: Dịch video xuống để hiện lồng đèn dưới navbar */
@media (min-width: 769px) {
  .tet-video {
    top: 48px !important;
    object-position: top center !important;
  }
}

/* Mobile: Video từ top-0 để hoa hiển thị đầy đủ */
@media (max-width: 768px) {
  .tet-video {
    top: 0 !important;
    object-position: center center !important;
  }
}
```

### 2. Tăng Margin Cards Trên Mobile

Để lại nhiều không gian hơn ở 2 bên (từ 6px → 16px):

```css
@media (max-width: 768px) {
  .fb-card {
    @apply bg-card/65 rounded-xl;
    margin-left: 16px;
    margin-right: 16px;
  }
}
```

### 3. Giảm Opacity Cards Trên Mobile Hơn Nữa

Từ `bg-card/70` xuống `bg-card/65` để hoa xuyên thấu rõ hơn qua content.

### 4. Tăng Cường TetFlowerOverlay

Tăng opacity và size của glow effect để hiệu ứng hoa rõ ràng hơn:

```tsx
// TetFlowerOverlay.tsx
className="fixed bottom-16 left-0 w-32 h-40 pointer-events-none z-[5] opacity-80"
// Tăng từ w-24 h-32 opacity-60 lên w-32 h-40 opacity-80
```

---

## Chi Tiết Các File Cần Sửa

| File | Thay Đổi | Chi Tiết |
|------|----------|----------|
| `src/components/ui/TetBackground.tsx` | Responsive top position | `top-0 md:top-12` thay vì `top-12` |
| `src/index.css` | Tăng margin + giảm opacity mobile | 16px margin, `bg-card/65` |
| `src/components/ui/TetFlowerOverlay.tsx` | Tăng size + opacity | w-32, h-40, opacity-80 |

---

## Kết Quả Mong Đợi

Sau khi áp dụng:

1. **Video hoa mai/đào** bắt đầu từ top-0 trên mobile → hiển thị đầy đủ hoa ở góc trên
2. **Cards có 16px margin** mỗi bên → không gian rõ ràng để thấy hoa ở 2 bên
3. **Cards trong suốt hơn** (65% opacity) → hoa xuyên thấu qua content
4. **Glow effect mạnh hơn** ở 2 góc dưới → tạo điểm nhấn Tết
5. **Desktop giữ nguyên** → không ảnh hưởng giao diện đã hoàn thiện
