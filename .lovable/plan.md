
## Kế Hoạch Bỏ Backdrop Mờ Trên Mobile

### Phân Tích Vấn Đề

Khi mở ANGEL AI Chat Widget, có một lớp **Backdrop** phủ toàn màn hình với:
- `bg-background/50` - nền mờ 50% opacity
- `backdrop-blur-sm` - blur nền phía sau

Backdrop này dùng để:
1. Làm mờ nội dung phía sau chat
2. Cho phép click ra ngoài để đóng chat

### Giải Pháp

Bỏ hoàn toàn Backdrop trên mobile - chat widget sẽ hiện trực tiếp mà không làm mờ nội dung phía sau.

### Thay Đổi Code

**File: `src/components/angel-ai/AngelChatWidget.tsx`**

| Dòng | Trước | Sau |
|------|-------|-----|
| 54-58 | Backdrop với `bg-background/50 backdrop-blur-sm` | Xóa hoàn toàn hoặc làm transparent |

```typescript
// TRƯỚC (dòng 54-58)
{/* Backdrop */}
<div 
  className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
  onClick={onClose}
/>

// SAU - Xóa hoàn toàn backdrop
// (Không cần backdrop vì có nút X để đóng chat)
```

### Thay Đổi Bổ Sung

Sau khi bỏ backdrop, cần điều chỉnh z-index của Chat Widget:

| Thuộc tính | Trước | Sau |
|------------|-------|-----|
| Chat Widget z-index | `z-40` | `z-50` (đảm bảo hiển thị trên các thành phần khác) |

### Kết Quả Mong Đợi

- Không còn lớp mờ khi mở ANGEL AI Chat
- Nội dung Feed phía sau vẫn hiển thị rõ ràng
- Chat widget hiện trực tiếp, tập trung vào conversation
- Bấm nút X hoặc icon khác để đóng chat (không cần click backdrop)
