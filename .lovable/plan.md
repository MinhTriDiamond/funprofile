

# Triển khai Facebook-like Feed Video Player theo plan đóng gói

## Phân tích hiện trạng

Dự án đã có `FacebookVideoPlayer` (autoplay, HLS, controls, PiP) và `FeedVideo` wrapper trong `MediaGrid.tsx`. Tuy nhiên, theo plan đóng gói, còn thiếu:

1. **`videoPlaybackCoordinator.ts`** — singleton đảm bảo chỉ 1 video phát cùng lúc (chưa tồn tại)
2. **`FeedVideoPlayer.tsx`** — component riêng với `displayMode` (square/rectangle), `aspectRatio`, `isLiveReplay`, `itemId` props, tích hợp coordinator (chưa tồn tại)
3. **`videoMeta`** trong types — chưa có trong `Post` type
4. **Tích hợp coordinator cho chunked manifest** — ChunkedVideoPlayer chưa được quản lý bởi one-active-video logic

## Các file thay đổi

### 1. TẠO: `src/components/feed/videoPlaybackCoordinator.ts`

Singleton module:
- `register(id, pauseFn)` — đăng ký video với callback pause
- `unregister(id)` — hủy đăng ký khi unmount
- `requestPlay(id)` — pause video đang phát trước đó, đặt video mới làm current
- `clearIfCurrent(id)` — xóa current nếu trùng id

### 2. TẠO: `src/components/feed/FeedVideoPlayer.tsx`

Component mới wrapping `FacebookVideoPlayer`, thêm:
- Props: `src`, `poster`, `displayMode` (default `'square'`), `isLiveReplay`, `aspectRatio`, `itemId`, `feedId`, `className`, `onError`
- **Square mode**: wrapper `aspect-square`, video `object-cover` (crop center kiểu Facebook)
- **Rectangle mode**: aspect ratio từ props hoặc fallback 16:9, `max-h-[70vh]`, video `object-contain`
- Tích hợp `videoPlaybackCoordinator`: register on mount, requestPlay khi play, unregister on unmount
- Badge `LIVE REPLAY` khi `isLiveReplay=true`
- IntersectionObserver threshold 0.6 (thay vì 0.5 hiện tại) theo plan

### 3. CẬP NHẬT: `src/types/posts.ts`

Thêm vào `Post` interface:
```typescript
videoMeta?: {
  width?: number;
  height?: number;
  duration?: number;
  isLiveReplay?: boolean;
  displayMode?: 'square' | 'rectangle';
};
```

### 4. CẬP NHẬT: `src/components/feed/MediaGrid.tsx`

- Thay `FeedVideo` bằng `FeedVideoPlayer` từ file mới
- Truyền `displayMode`, `aspectRatio`, `isLiveReplay`, `itemId` props
- Tích hợp coordinator cho cả nhánh ChunkedVideoPlayer (wrap trong logic register/requestPlay)
- Loại bỏ live replay badge trùng lặp trong MediaGrid (đã có trong FeedVideoPlayer)

### 5. CẬP NHẬT: `src/components/feed/FacebookPostCard.tsx`

- Truyền `post.id` làm `feedId` xuống `MediaGrid`
- Map `videoMeta` từ post metadata vào media items để `MediaGrid` forward xuống `FeedVideoPlayer`

### 6. CẬP NHẬT: `src/components/ui/FacebookVideoPlayer.tsx`

- Thêm prop `objectFit?: 'contain' | 'cover'` để FeedVideoPlayer có thể điều khiển fit mode từ bên ngoài (square = cover, rectangle = contain)
- Thêm callback `onPlayStart` để FeedVideoPlayer hook vào coordinator

## Không thay đổi

- `SocialVideoPlayer.tsx` — giữ nguyên cho gallery viewer
- `LazyVideo.tsx` — giữ nguyên, không xóa
- Backend / DB schema — không thay đổi

