

## Sửa lỗi Emoji Picker không hoạt động trong Dialog

### Nguyên nhân

Emoji Picker dùng Radix `Popover`, nhưng nó nằm bên trong Radix `Dialog`. Mặc định, Radix Dialog "trap" focus và portal content bên trong dialog — khi PopoverContent render qua portal, nó bị Dialog chặn hoặc đóng ngay lập tức.

### Giải pháp

Thêm thuộc tính `modal={false}` vào `Popover` và sử dụng `onOpenAutoFocus={(e) => e.preventDefault()}` trên `PopoverContent` để tránh xung đột focus trap giữa Dialog và Popover. Ngoài ra, set `sideOffset` và `z-index` cao hơn để popover hiển thị đúng vị trí.

### File thay đổi

**`src/components/feed/EmojiPicker.tsx`** — 2 thay đổi nhỏ:
1. Thêm `modal={false}` vào `<Popover>`
2. Thêm `onOpenAutoFocus={e => e.preventDefault()}` và `className="w-80 p-0 z-[9999]"` vào `<PopoverContent>`

