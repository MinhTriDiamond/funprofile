

# Sửa lỗi không cuộn được danh sách chat trên mobile

## Nguyên nhân gốc (Root Cause)

Chuỗi height bị đứt tại `PullToRefreshContainer`: component này render một `<div style={{ transform }}>` bọc children nhưng **không có `h-full`** → `ScrollArea` bên trong không biết chiều cao parent → không cuộn được.

Chuỗi hiện tại:
```text
<main fixed overflow-hidden h=calc>     ← OK, có height
  └─ PullToRefreshContainer h-full      ← OK (relative div)
      └─ <div style={transform}>        ← ❌ THIẾU h-full, overflow
          └─ <div h-full flex-col>
              └─ Header
              └─ ScrollArea flex-1      ← không scroll được vì parent không có height
```

## Thay đổi cần thực hiện

### File 1: `src/components/common/PullToRefreshContainer.tsx` (dòng 89-96)

Thêm `className="h-full"` và iOS scroll support cho div transform wrapper:

```tsx
<div
  className="h-full"
  style={{
    transform: `translateY(${pullDistance}px)`,
    transition: isPulling ? 'none' : 'transform 0.3s ease-out',
  }}
>
```

### File 2: `src/modules/chat/components/ConversationList.tsx` (dòng 50-51)

Thêm iOS momentum scroll cho ScrollArea + đảm bảo `min-h-0` (flex item cần min-h-0 để co lại):

```tsx
<ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
```

### File 3: `src/modules/chat/pages/Chat.tsx` (dòng 110, 112)

Đổi wrapper và main dùng `h-dvh` thay `min-h-screen`, bỏ `overflow-hidden` ở wrapper ngoài:

- Dòng 110: `<div className="h-dvh flex flex-col bg-background/80">` (bỏ `min-h-screen overflow-hidden`)
- Dòng 112: giữ `overflow-hidden` trên main (đúng rồi), nhưng thêm `min-h-0` để flex item co đúng

Tổng cộng sửa **3 file**, không ảnh hưởng trang khác.

