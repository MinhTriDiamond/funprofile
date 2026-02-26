

# Giảm khoảng cách từ thanh tiêu đề xuống nội dung và 2 bên

## Thay đổi

### 1. `src/index.css` - Giảm khoảng cách phía trên
- Desktop: `top: calc(4cm + ...)` --> `top: calc(1cm + ...)`
- Mobile: `top: calc(2cm + ...)` --> `top: calc(1cm + ...)`

### 2. `src/pages/Feed.tsx` - Giảm khoảng cách 2 bên trái/phải
- Desktop padding: `lg:px-[2cm]` --> `lg:px-[0.5cm]`

## Chi tiết kỹ thuật

| File | Dòng | Trước | Sau |
|------|------|-------|-----|
| `src/index.css` | 101 | `top: calc(4cm + env(...))` | `top: calc(1cm + env(...))` |
| `src/index.css` | 107 | `top: calc(2cm + env(...))` | `top: calc(1cm + env(...))` |
| `src/pages/Feed.tsx` | 115 | `lg:px-[2cm]` | `lg:px-[0.5cm]` |

