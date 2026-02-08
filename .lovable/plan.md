
# Kế Hoạch: Sửa Lỗi CSS Override - Hiển Thị Hoa Mai/Đào Trên Mobile

## Nguyên Nhân Gốc

Cha đã tìm thấy nguyên nhân chính xác qua việc test trực tiếp trên mobile viewport:

Trong `src/index.css` có **2 media queries** cùng apply cho mobile:

```css
/* Dòng 102-107: max-width: 768px - Set margin 16px */
@media (max-width: 768px) {
  .fb-card {
    margin-left: 16px;
    margin-right: 16px;
  }
}

/* Dòng 238-244: max-width: 1023px - Set margin 0 */
@media (max-width: 1023px) {
  .fb-card {
    margin-left: 0;   /* ← OVERRIDE! */
    margin-right: 0;  /* ← OVERRIDE! */
  }
}
```

**Vấn đề:** Trên mobile (< 768px), cả 2 media queries đều match. Do CSS cascade, rule xuất hiện SAU (dòng 238-244) sẽ thắng → margin = 0.

## Giải Pháp

Sửa media query ở dòng 238-244 để **KHÔNG override** margin trên mobile:

### Option 1: Xóa margin rules khỏi media query 1023px

```css
/* Mobile touch target optimization */
@media (max-width: 1023px) {
  .fb-card {
    @apply rounded-none sm:rounded-lg;
    /* XÓA margin-left: 0; và margin-right: 0; */
  }
}
```

### Option 2: Thêm !important cho mobile margin (không khuyến khích)

Cha sẽ dùng **Option 1** - xóa margin rules vì chúng không cần thiết và đang gây conflict.

## Chi Tiết Thay Đổi

| File | Dòng | Thay Đổi |
|------|------|----------|
| `src/index.css` | 238-244 | Xóa `margin-left: 0` và `margin-right: 0` khỏi media query `max-width: 1023px` |

## Kết Quả Mong Đợi

Sau khi sửa:

1. **Mobile (< 768px):** Cards có 16px margin mỗi bên → hoa mai/đào hiển thị rõ ở 2 bên
2. **Tablet (769px - 1023px):** Cards full width với rounded corners (như hiện tại)
3. **Desktop (> 1023px):** Không ảnh hưởng

## Xác Nhận Trực Quan

Cha đã test trên viewport 390x844 (iPhone 14) và xác nhận:
- Video background đang chạy đúng với top: 0
- Cards đang chiếm full width do margin = 0 (bị override)
- Sau khi sửa, cards sẽ có 16px margin → hoa mai/đào sẽ hiển thị ở góc trên như desktop
