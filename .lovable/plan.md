

# Sửa 5 Bug từ QA Report + Bổ sung Haptic Feedback

## Thay đổi

### 1. `src/components/feed/CommentItem.tsx` — Bug 1
- Xóa dòng 15: `import { linkifyText } from '@/utils/linkifyText';` (không sử dụng)

### 2. `src/components/feed/CommentMediaUpload.tsx` — Bug 2 & 3
- Thêm backdrop overlay mờ (`fixed inset-0 bg-black/20 backdrop-blur-sm z-40`) khi GIF hoặc Sticker picker đang mở, click vào backdrop sẽ đóng picker
- Đổi positioning picker từ `absolute bottom-full left-0` thành `fixed bottom-0 left-0 right-0` trên mobile (hoặc `absolute` với `max-w-[calc(100vw-2rem)]` và `right-0` thay vì `left-0`) để không bị tràn viền

### 3. `src/components/feed/ReactionButton.tsx` — Bug 4
- Dòng 363: Apply `menuOffset` vào style của reaction menu div: `style={{ transform: \`translateX(${menuOffset}px)\` }}`
- `menuOffset` đã được tính toán dựa trên viewport width (dòng 59-81), chỉ cần gắn vào JSX

### 4. `src/components/feed/ShareDialog.tsx` — Bug 5
- Thêm `max-h-[80vh] overflow-y-auto` vào div chứa nội dung bên trong `DialogContent` để scroll được trên mobile nhỏ

### 5. Haptic Feedback — Bổ sung mới

**`src/components/feed/HeartAnimation.tsx`:**
- Thêm `navigator.vibrate?.(10)` khi animation bắt đầu (trong `useEffect` khi `show` = true)

**`src/components/feed/CommentReactionButton.tsx`:**
- Thêm `navigator.vibrate?.(10)` trong `handleReaction()` khi reaction thành công

**`src/components/feed/ReactionButton.tsx`:**
- Đã có `triggerHaptic()` — xác nhận đang hoạt động đúng, không cần thay đổi thêm

## Chi tiết kỹ thuật

**Backdrop overlay pattern:**
```tsx
{(showGifPicker || showStickerPicker) && (
  <div
    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
    onClick={() => { setShowGifPicker(false); setShowStickerPicker(false); }}
  />
)}
```

**Picker responsive positioning:**
```tsx
<div className="fixed bottom-4 left-2 right-2 z-50 sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-80">
```

**MenuOffset apply:**
```tsx
<div
  ref={reactionMenuRef}
  className="absolute bottom-full left-0 mb-2 ..."
  style={{
    transform: `translateX(${menuOffset}px)`,
    WebkitTouchCallout: 'none',
    touchAction: 'none',
  }}
>
```

**Haptic trong HeartAnimation:**
```tsx
useEffect(() => {
  if (show) {
    setVisible(true);
    navigator.vibrate?.(10);
    // ...
  }
}, [show, onComplete]);
```

### Tổng kết: 6 files thay đổi

| File | Thay đổi |
|------|----------|
| `CommentItem.tsx` | Xóa import thừa `linkifyText` |
| `CommentMediaUpload.tsx` | Backdrop overlay + responsive picker positioning |
| `ReactionButton.tsx` | Apply `menuOffset` vào `style.transform` |
| `ShareDialog.tsx` | Thêm `max-h-[80vh] overflow-y-auto` |
| `HeartAnimation.tsx` | Thêm `navigator.vibrate?.(10)` |
| `CommentReactionButton.tsx` | Thêm `navigator.vibrate?.(10)` khi reaction thành công |

