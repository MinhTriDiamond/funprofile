
# Kế Hoạch: Giữ Nguyên Giao Diện Desktop, Chỉ Tối Ưu Mobile

## Vấn Đề Hiện Tại

Các thay đổi vừa thực hiện ảnh hưởng đến cả desktop:
1. **TetBackground.tsx**: `scale(1.15)` + filter mới áp dụng cho tất cả màn hình
2. **Feed.tsx**: `px-2` giảm padding trên tất cả màn hình
3. **TetFlowerOverlay**: Hiển thị trên cả desktop (không cần thiết)

## Giải Pháp

### 1. TetBackground.tsx - Responsive Scale

Chỉ scale và tăng filter trên mobile, giữ nguyên desktop:

```tsx
// Desktop: scale(1), Mobile: scale(1.15)
className="absolute top-0 left-1/2 w-auto h-auto min-w-full min-h-full object-cover 
           md:object-top object-center"
style={{
  transform: 'translateX(-50%)',
}}

// Thêm CSS media query trong index.css cho mobile scale
```

Hoặc dùng CSS media query trong `index.css`:
```css
/* Mobile: Scale video lớn hơn để hoa mai/đào hiển thị rõ */
@media (max-width: 768px) {
  .tet-video {
    transform: translateX(-50%) scale(1.15) !important;
    filter: saturate(1.25) contrast(1.12) brightness(1.05) !important;
  }
}
```

### 2. Feed.tsx - Responsive Padding

Khôi phục `px-4` cho mobile, giữ desktop padding:

```tsx
// Hiện tại: px-2 sm:px-6 lg:px-[2cm]
// Sửa thành: px-4 sm:px-6 lg:px-[2cm] (như ban đầu)
// Hoặc: px-3 sm:px-6 lg:px-[2cm] (giảm nhẹ để hoa hiện)
```

### 3. TetFlowerOverlay - Chỉ Hiển Thị Trên Mobile

Thêm class `md:hidden` để ẩn trên desktop:

```tsx
<div className="md:hidden">
  {/* Gradient fade + glow effects chỉ trên mobile */}
</div>
```

### 4. index.css - Giữ Nguyên

Đã đúng với media query `max-width: 768px`, không ảnh hưởng desktop ✅

---

## Chi Tiết Các File Cần Sửa

| File | Thay Đổi | Chi Tiết |
|------|----------|----------|
| `src/components/ui/TetBackground.tsx` | Responsive scale | Scale 1.15 chỉ trên mobile |
| `src/components/ui/TetFlowerOverlay.tsx` | Ẩn trên desktop | Thêm `md:hidden` |
| `src/pages/Feed.tsx` | Khôi phục padding | `px-4` thay vì `px-2` |

---

## Kết Quả Mong Đợi

- **Desktop**: Giữ nguyên 100% như trước khi sửa
- **Mobile**: Hoa mai/đào hiển thị rõ ràng ở 2 góc với hiệu ứng glow
- **Không có breaking changes** cho giao diện desktop
