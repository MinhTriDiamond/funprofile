

## Gộp khung soạn bài viết thành 1 hàng duy nhất (giống Facebook)

### Hiện tại
- Hàng 1: Avatar + Input text
- Hàng 2: Video trực tiếp | Ảnh/Video | Cảm xúc (dưới border-t)

### Mục tiêu (giống ảnh Facebook mẫu)
- **1 hàng duy nhất**: Avatar — Input — [Camera icon] [Photo icon] [Emoji icon]
- Bỏ phần toolbar bên dưới (border-t + 3 nút text)
- 3 icon nhỏ gọn nằm bên phải input, cùng hàng

### Thay đổi

**File: `src/components/feed/FacebookCreatePost.tsx`**

1. **Main composer (line ~568-601)**: Gộp avatar + input + 3 icon action vào cùng 1 `flex` row. Bỏ `div.border-t` chứa toolbar riêng
2. **3 icon action** (Video, Ảnh, Cảm xúc) chuyển thành icon-only buttons nhỏ (`w-9 h-9`) nằm bên phải input, không có text label
3. **Guest mode (line ~491-522)**: Áp dụng layout tương tự — 1 hàng avatar + input + icons
4. Giữ nguyên toàn bộ logic (click mở dialog, navigate, v.v.)

### Layout mới
```text
[Avatar] [____Input text field____] [📹] [🖼] [😊]
```

