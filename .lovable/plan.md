
# Kế Hoạch: Điều Chỉnh Vị Trí Hoa Mai/Đào và Lồng Đèn

## Phân Tích Yêu Cầu

Theo hình ảnh tham khảo:
- **Desktop**: Hoa mai/đào và lồng đèn nằm từ phía dưới header (~48px-56px từ top) xuống
- **Mobile**: Tương tự - hoa/lồng đèn bắt đầu ngay dưới tiêu đề

## Hiện Trạng

| Component | Vị trí hiện tại |
|-----------|-----------------|
| `TetBackground` | `fixed inset-0` → Bắt đầu từ top: 0 |
| `FacebookNavbar` (header) | `h-12 md:h-14` → 48px mobile, 56px desktop |
| Nội dung chính | `top: 4cm` desktop, `top: 2cm` mobile |

Vấn đề: Video nền đang phủ từ top: 0, trong khi người dùng muốn hoa/lồng đèn bắt đầu từ dưới header.

## Giải Pháp

Điều chỉnh container của `TetBackground` để bắt đầu từ phía dưới navbar thay vì từ top 0:

### Bước 1: Cập nhật TetBackground.tsx
Thay đổi `inset-0` thành vị trí cụ thể bắt đầu từ dưới header:
- Desktop: `top: 56px` (14 × 4 = 56px = h-14)
- Mobile: `top: 48px` (12 × 4 = 48px = h-12)

### Bước 2: Cập nhật CSS trong index.css
Thêm class `.tet-background-container` với quy tắc vị trí responsive.

## Chi Tiết Kỹ Thuật

### File 1: `src/components/ui/TetBackground.tsx`

**Thay đổi:**
```tsx
// Trước
<div 
  className="fixed inset-0 overflow-hidden pointer-events-none tet-background-container"
  style={{ zIndex: -100 }}
>

// Sau
<div 
  className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none tet-background-container"
  style={{ zIndex: -100, top: '56px' }}
>
```

Sử dụng CSS class để xử lý responsive thay vì inline style.

### File 2: `src/index.css`

**Thêm CSS cho container:**
```css
/* Tết Background - Bắt đầu từ dưới header */
.tet-background-container {
  top: 56px; /* Height of header on desktop (h-14 = 56px) */
}

@media (max-width: 768px) {
  .tet-background-container {
    top: 48px; /* Height of header on mobile (h-12 = 48px) */
  }
}
```

**Điều chỉnh object-position của video:**
```css
.tet-video {
  object-fit: cover;
  object-position: top center; /* Giữ hoa mai/lồng đèn ở phía trên */
}

@media (max-width: 768px) and (orientation: portrait) {
  .tet-video {
    object-fit: contain;
    object-position: top center;
  }
}
```

## Tổng Kết Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `src/components/ui/TetBackground.tsx` | Thay `inset-0` → `left-0 right-0 bottom-0` + class responsive |
| `src/index.css` | Thêm CSS cho `.tet-background-container` với top responsive |

## Kết Quả Mong Đợi

- **Desktop**: Hoa mai/đào và lồng đèn xuất hiện từ vị trí 56px (dưới header) xuống cuối màn hình
- **Mobile**: Hoa mai/đào và lồng đèn xuất hiện từ vị trí 48px (dưới header) xuống cuối màn hình
- Header không bị che bởi video background
- Nội dung vẫn hiển thị đúng với transparent cards
- Tương thích iOS Safari, Chrome, Firefox
