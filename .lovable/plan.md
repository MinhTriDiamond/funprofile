
# Kế Hoạch: Hiển Thị Rõ Lồng Đèn và Hoa Mai/Hoa Đào Trên Desktop

## Phân Tích Hiện Tại

Nhìn vào giao diện desktop hiện tại:
- Video đang hiển thị nhưng **chưa có filter** để tăng màu sắc
- Lồng đèn ở phần trên bị che bởi header
- Hoa mai/đào ở 2 bên bị che một phần bởi sidebars
- Video chưa được scale để hiển thị đầy đủ các chi tiết

## Giải Pháp Chi Tiết

### 1. Tăng Cường Video Trên Desktop

Thêm filter cho video trên desktop (nhẹ hơn mobile để không quá sặc sỡ):

```css
/* Desktop: Tăng màu sắc hoa mai/hoa đào nhẹ nhàng */
.tet-video {
  filter: saturate(1.15) contrast(1.08) brightness(1.02);
}

/* Mobile: Đã có - giữ nguyên scale(1.15) + filter mạnh hơn */
@media (max-width: 768px) {
  .tet-video {
    transform: translateX(-50%) scale(1.15) !important;
    filter: saturate(1.25) contrast(1.12) brightness(1.05) !important;
  }
}
```

### 2. Điều Chỉnh Video Position - Hiển Thị Lồng Đèn

Video cần dịch xuống một chút để lồng đèn ở phần trên hiển thị dưới header:

```tsx
// TetBackground.tsx
className="tet-video absolute top-12 left-1/2 ..."
// hoặc sử dụng object-position: top để focus vào phần trên video
style={{
  objectPosition: 'top center',
}}
```

### 3. Sidebars Trong Suốt Hơn

Giảm opacity của left/right sidebar để hoa xuyên qua:

```css
/* Desktop sidebars trong suốt hơn */
.fb-card {
  @apply bg-card/85; /* từ 80% xuống 85% nhưng có thể thấy qua */
}
```

---

## Chi Tiết Các File Cần Sửa

| File | Thay Đổi | Chi Tiết |
|------|----------|----------|
| `src/index.css` | Thêm desktop filter | `saturate(1.15) contrast(1.08)` cho `.tet-video` |
| `src/components/ui/TetBackground.tsx` | Điều chỉnh position | `top-12` và `object-top` để hiển thị lồng đèn |

---

## Kết Quả Mong Đợi

Sau khi áp dụng:

1. **Lồng đèn** hiển thị rõ ràng ở phần trên màn hình desktop
2. **Hoa mai/hoa đào** hiển thị sắc nét hơn với màu tươi sáng
3. **Nội dung vẫn dễ đọc** - chỉ tăng nhẹ filter, không quá sặc sỡ
4. **Mobile giữ nguyên** - không ảnh hưởng các tối ưu đã làm
5. **Không khí Tết** tràn ngập trên cả desktop và mobile

---

## Lưu Ý

- Filter desktop nhẹ hơn mobile (1.15 vs 1.25 saturate) để phù hợp với màn hình lớn
- Video sẽ được căn từ `top-12` (48px) để lồng đèn hiển thị dưới navbar
- Giữ nguyên `zIndex: -100` để video nằm dưới tất cả nội dung
