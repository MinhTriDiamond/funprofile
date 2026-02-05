

## Kế Hoạch Fix ANGEL AI Options Menu

### Phân Tích Vấn Đề

Khi click vào avatar ANGEL AI, hiện ra bảng Options Menu với 2 lựa chọn:
- "Chat ngay" - Mở chat tại đây
- "Mở trang riêng" - Mở angel.fun.rich

Bảng này có các thuộc tính làm nó mờ:
- `bg-card/95` - Background 95% opacity
- `backdrop-blur-xl` - Blur nền phía sau

### Giải Pháp Đề Xuất: Bỏ Options Menu

Thay vì hiện menu chọn, click vào avatar ANGEL AI sẽ **mở Chat Widget ngay** (UX đơn giản hơn).

Nếu bé muốn mở trang riêng angel.fun.rich, đã có nút External Link trong header của Chat Widget.

### Thay Đổi Code

**File: `src/components/angel-ai/AngelFloatingButton.tsx`**

| Trước | Sau |
|-------|-----|
| `handleBubbleClick` toggle `showOptions` | `handleBubbleClick` mở Chat Widget trực tiếp |
| Có Options Menu popup | Không cần Options Menu |

```typescript
// TRƯỚC
const handleBubbleClick = () => {
  setShowOptions(!showOptions);
};

// SAU
const handleBubbleClick = () => {
  setIsChatOpen(true);
};
```

Và xóa phần Options Menu JSX (dòng 33-65).

### Kết Quả Mong Đợi

- Click vào avatar ANGEL AI → Chat Widget mở ngay
- Không còn bảng mờ Options Menu
- Nút External Link vẫn có trong Chat Widget header để mở angel.fun.rich

