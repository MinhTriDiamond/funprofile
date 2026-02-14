

## Fix nhạc tự động phát khi người dùng vào trang

### Tình trạng hiện tại
Code đã có logic autoplay, nhưng có một lỗi nhỏ: khi trình duyệt chặn autoplay (hầu hết trình duyệt hiện đại đều làm vậy), hệ thống đợi người dùng click/chạm lần đầu để bật nhạc. Tuy nhiên, nếu component bị mount lại (chuyển trang), trạng thái nút nhạc không đồng bộ -- nhạc phát nhưng nút không hiển thị đang phát.

### Giải pháp
Cải thiện logic trong `ValentineMusicButton.tsx`:

1. Thêm listener cho sự kiện `play` và `pause` trên audio element để đồng bộ trạng thái nút nhạc chính xác, bất kể component mount/unmount bao nhiêu lần.

2. Đảm bảo resume listener (khi browser chặn autoplay) cập nhật trạng thái toàn cục thay vì dựa vào closure cũ.

### Chi tiết kỹ thuật

**File:** `src/components/layout/ValentineMusicButton.tsx`

- Thêm useEffect lắng nghe sự kiện `play`/`pause` trên globalAudio để luôn đồng bộ `isPlaying`:

```tsx
useEffect(() => {
  const audio = ensureAudio();
  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  // Sync initial state
  setIsPlaying(!audio.paused);
  return () => {
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('pause', onPause);
  };
}, []);
```

- Trong `resumeOnInteraction`, bỏ `setIsPlaying` (vì listener `play` event sẽ tự động cập nhật).

Kết quả: Nhạc sẽ tự động phát khi người dùng vào trang. Nếu trình duyệt chặn, nhạc sẽ bật ngay khi người dùng click/chạm bất kỳ đâu trên trang. Nút nhạc luôn hiển thị đúng trạng thái (đang phát hay tắt). Người dùng tự tắt khi không muốn nghe.
