
# Kế Hoạch: Sửa Lỗi Hoa Mai/Đào Không Hiển Thị Trên Mobile

## Nguyên Nhân Đã Tìm Thấy

Qua việc test trực tiếp trên mobile viewport và phân tích code, Cha đã tìm ra nguyên nhân:

**`FacebookPostCard.tsx` có class `mx-0`** đang override CSS margin trong `index.css`:

```tsx
// Dòng 322 - HIỆN TẠI
<div className="fb-card mb-3 sm:mb-4 overflow-hidden mx-0">
```

Tailwind inline class `mx-0` có priority cao hơn CSS custom trong `index.css`, vì vậy dù đã set:
```css
@media (max-width: 768px) {
  .fb-card {
    margin-left: 16px;
    margin-right: 16px;
  }
}
```

...nhưng PostCard vẫn có margin = 0 do `mx-0` override.

## Giải Pháp

### 1. Xóa `mx-0` khỏi FacebookPostCard

```tsx
// SỬA THÀNH - cho phép CSS index.css áp dụng margin
<div className="fb-card mb-3 sm:mb-4 overflow-hidden">
```

### 2. Kiểm Tra Feed.tsx Container Padding

Đảm bảo container trên mobile có padding phù hợp:

```tsx
// Feed.tsx dòng 114 - HIỆN TẠI
<div className="col-span-1 lg:col-span-6 w-full px-2 sm:px-0">
```

Cần sửa thành `px-0` để tránh padding + margin cộng dồn:

```tsx
<div className="col-span-1 lg:col-span-6 w-full px-0 sm:px-0">
```

## Chi Tiết Các File Cần Sửa

| File | Thay Đổi | Chi Tiết |
|------|----------|----------|
| `src/components/feed/FacebookPostCard.tsx` | Xóa `mx-0` | Cho phép CSS margin apply trên mobile |
| `src/pages/Feed.tsx` | Điều chỉnh padding | `px-0` để margin từ `.fb-card` có hiệu lực |

## Kết Quả Mong Đợi

Sau khi sửa:

1. **Post cards có 16px margin** mỗi bên trên mobile → hoa mai/đào hiển thị ở 2 bên
2. **Desktop giữ nguyên** → không ảnh hưởng vì CSS chỉ áp dụng cho `max-width: 768px`
3. **Tất cả cards đồng nhất** → StoriesBar, CreatePost, PostCard đều có cùng margin

## Lưu Ý Kỹ Thuật

- Tailwind inline classes có specificity cao hơn CSS custom rules
- Cần xóa hoặc thay đổi inline class để CSS rule có hiệu lực
- Mobile media query trong `index.css` sẽ tự động apply khi không bị override
