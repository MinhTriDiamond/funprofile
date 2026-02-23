
# Thêm Hộp Thoại Xác Nhận Khi Rời Trang Live Stream

## Vấn Đề
Khi host đang live stream, nếu bấm vào tab Feed, Chat, Bạn bè... (rời khỏi trang Live), hệ thống không có cảnh báo nào. Host có thể vô tình rời trang và mất buổi live.

## Giải Pháp
Chặn navigation khi host đang live bằng cách sử dụng `react-router-dom`'s `useBlocker` hook. Khi host cố rời trang:
- Hiển thị AlertDialog: "Bạn đang rời khỏi trang Live Stream. Bạn có chắc không?"
- **Bấm OK**: Gọi `handleEndLive()` để kết thúc live + lưu video, sau đó cho phép navigation
- **Bấm Cancel**: Ở lại trang Live

## Thay Đổi

### File: `src/modules/live/pages/LiveHostPage.tsx`

1. **Import thêm**: `useBlocker` từ `react-router-dom`, và các component `AlertDialog` từ UI library

2. **Thêm `useBlocker` hook**: Chặn navigation khi đang live (session status = 'live' và isHost = true, và không đang trong trạng thái kết thúc)

```typescript
const shouldBlock = isHost && session?.status === 'live' && isJoined && !isEnding;

const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    shouldBlock && currentLocation.pathname !== nextLocation.pathname
);
```

3. **Thêm hàm xử lý xác nhận rời trang**: Khi bấm OK, gọi `handleEndLive()` rồi cho phép navigation đi tiếp

```typescript
const handleConfirmLeave = async () => {
  await handleEndLive(); // Kết thúc live + lưu video
  blocker.proceed?.();   // Cho phép chuyển trang
};
```

4. **Thêm AlertDialog vào JSX**: Hiển thị khi blocker.state === 'blocked'

```
AlertDialog:
  Title: "Rời khỏi Live Stream?"
  Description: "Bạn đang phát trực tiếp. Nếu rời đi, buổi live sẽ kết thúc và video sẽ được lưu lại."
  Cancel: "Ở lại" -> blocker.reset()
  OK: "Kết thúc & Rời đi" -> handleConfirmLeave()
```

5. **Cập nhật `handleEndLive`**: Thêm tham số tùy chọn để khi được gọi từ blocker, không navigate (vì blocker sẽ tự proceed đến đúng trang người dùng muốn đến)

## Kết Quả Mong Đợi
- Host bấm vào tab Feed khi đang live -> Hiện hộp thoại cảnh báo
- Bấm "Ở lại" -> Tiếp tục live bình thường
- Bấm "Kết thúc & Rời đi" -> Live kết thúc, video lưu lại, chuyển đến trang người dùng muốn đến
- Nút "End Live" trên trang vẫn hoạt động bình thường như cũ
