
# Sửa lỗi crash khi cuộn qua nhiều video trên Profile

## Nguyên nhân gốc

Trong `FeedVideoPlayer.tsx` dòng 60, `obs.disconnect()` khiến video **chỉ mount mà không bao giờ unmount** khi rời viewport. Mỗi video đã cuộn qua vẫn giữ:
- 1 `<video>` element (tải/buffer data)
- 1 `requestAnimationFrame` loop chạy liên tục
- 1 HLS instance (nếu có)
- Nhiều event listeners

User cuộn qua 10+ video trên profile = 10+ video elements tích lũy trong bộ nhớ, dẫn đến crash.

## Giải pháp: Unmount video hai chiều

### File: `src/components/feed/FeedVideoPlayer.tsx`

Thay đổi IntersectionObserver từ "one-way mount" sang "bidirectional mount/unmount":

```text
Trước (dòng 56-67):
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true);
        obs.disconnect(); // ← BUG: không bao giờ unmount
      }
    },
    { rootMargin: '200px' }
  );

Sau:
  const obs = new IntersectionObserver(
    ([entry]) => {
      setIsNearViewport(entry.isIntersecting);
    },
    { rootMargin: '400px' }  // mount sớm hơn, unmount muộn hơn
  );
```

Khi `isNearViewport` chuyển `false`:
- `FacebookVideoPlayer` / `ChunkedVideoPlayer` bị React unmount
- Video element bị xóa khỏi DOM
- RAF loop, HLS instance, event listeners tự cleanup qua useEffect return
- Thay bằng placeholder poster + Play icon (nhẹ)

Khi `isNearViewport` chuyển `true` lại:
- Video player mount lại, bắt đầu từ đầu (chấp nhận được vì autoPlayInView sẽ xử lý)

### rootMargin tăng lên 400px

Tăng vùng đệm từ 200px lên 400px để:
- Video mount sớm hơn khi user cuộn tới (trải nghiệm mượt)
- Video unmount muộn hơn khi cuộn qua (tránh flicker khi cuộn chậm)
- Nhưng video cách xa viewport 400px+ sẽ bị unmount hoàn toàn

## Kết quả mong đợi

- Tại mọi thời điểm chỉ có tối đa 3-5 video elements tồn tại (những cái trong viewport + vùng đệm 400px)
- Cuộn qua 50 video cũng không crash vì các video cũ đã bị unmount
- Không thay đổi backend hay component con (`FacebookVideoPlayer`, `ChunkedVideoPlayer`)

## File thay đổi
- `src/components/feed/FeedVideoPlayer.tsx` — Sửa IntersectionObserver thành bidirectional
