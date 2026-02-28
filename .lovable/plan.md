

# Smart Portrait Fit + Blurred Backdrop

## Tổng quan

Video dọc (portrait) trong khung vuông 1:1 đang bị crop bởi `object-cover`. Cần detect orientation rồi chuyển sang `object-contain` cho portrait, kèm backdrop blur phía sau để lấp khoảng trống.

## Các file thay đổi

### 1. CẬP NHẬT: `src/components/feed/FeedVideoPlayer.tsx`

- **Thêm prop `fitStrategy`**: `'smart' | 'cover' | 'contain'` (default `'smart'`)
- **Thêm prop `aspectRatio`** dạng object `{ width: number; height: number }` (thay vì number hiện tại) để detect orientation từ metadata
- **Thêm state `isPortrait`**: khởi tạo từ `aspectRatio` props, fallback detect qua `video.videoWidth/videoHeight` khi `loadedmetadata`
- **Tính `resolvedObjectFit`**:
  - `displayMode='rectangle'` => luôn `contain`
  - `displayMode='square'`:
    - `fitStrategy='smart'`: portrait => `contain`, landscape => `cover`
    - `fitStrategy='cover'`: luôn `cover`
    - `fitStrategy='contain'`: luôn `contain`
- **Thêm blurred backdrop** khi square + resolvedObjectFit === 'contain':
  - Layer absolute, full size, `z-0`
  - Nếu có `poster`: render `<img>` với `object-cover blur-xl opacity-40 scale-110`
  - Nếu không poster: render `<video>` backdrop muted, mirror play/pause + sync currentTime (best-effort, lệch > 0.25s)
  - Foreground `FacebookVideoPlayer` đặt `z-10 relative`
- **Truyền `resolvedObjectFit`** xuống `FacebookVideoPlayer` qua prop `objectFit`

### 2. CẬP NHẬT: `src/components/feed/MediaGrid.tsx`

- Truyền `fitStrategy="smart"` cho tất cả `FeedVideoPlayer` call sites (square mode)
- Single video (rectangle) không cần fitStrategy (mặc định contain)

### 3. KHÔNG thay đổi

- `FacebookVideoPlayer.tsx` — đã có prop `objectFit`, không cần sửa
- `videoPlaybackCoordinator.ts` — giữ nguyên
- Backend / types — không cần migration

## Behavior Matrix

```text
displayMode  | fitStrategy | orientation | objectFit | backdrop
-------------|-------------|-------------|-----------|--------
square       | smart       | portrait    | contain   | YES (blur)
square       | smart       | landscape   | cover     | NO
square       | cover       | any         | cover     | NO
square       | contain     | any         | contain   | YES (blur)
rectangle    | any         | any         | contain   | NO
```

## Backdrop Strategy

```text
┌─────────────────────────┐
│  <img/video> backdrop   │  ← object-cover, blur-xl, opacity-40, scale-110
│  ┌───────────────────┐  │
│  │                   │  │
│  │  video (contain)  │  │  ← sharp foreground, z-10
│  │                   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

