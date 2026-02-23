

# Thêm Cảnh Báo Khi Đóng Tab / Refresh Trang Trong Khi Đang Live

## Vấn Đề
Hiện tại, nếu host đóng tab trình duyệt hoặc refresh trang (F5) trong khi đang live stream, trang sẽ đóng ngay lập tức mà không có cảnh báo nào. Video live có thể bị mất.

## Giải Pháp
Sử dụng sự kiện `beforeunload` của trình duyệt để hiển thị cảnh báo mặc định của trình duyệt khi host cố đóng tab hoặc refresh trang trong khi đang live.

## Thay Đổi

### File: `src/modules/live/pages/LiveHostPage.tsx`

Thêm 1 `useEffect` mới sử dụng `beforeunload` event:

```typescript
useEffect(() => {
  if (!shouldBlock) return;

  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [shouldBlock]);
```

- Tận dụng biến `shouldBlock` đã có sẵn (= `isHost && session?.status === 'live' && isJoined && !isEnding`)
- Khi điều kiện đúng, trình duyệt sẽ hiện hộp thoại mặc định: "Changes you made may not be saved" (do trình duyệt quyết định nội dung)
- Chỉ thêm khoảng 10 dòng code vào 1 file duy nhất

