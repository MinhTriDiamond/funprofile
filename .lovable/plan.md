

# Tích hợp Facebook-Style Feed Video Player

## Tổng quan

Xây dựng component `FacebookVideoPlayer` mới để thay thế `LazyVideo`/`FeedVideo` trong feed, mang lại trải nghiệm xem video giống Facebook: autoplay muted khi cuộn vào viewport, pause khi ra khỏi, controls overlay hiện đại, hỗ trợ HLS + MP4.

---

## Các file thay đổi

### 1. TẠO: `src/components/ui/FacebookVideoPlayer.tsx`

Component chính, bao gồm:

- **Props**: `src`, `sources[]`, `poster`, `width`, `height`, `autoPlayInView` (default true), `mutedByDefault` (default true), `className`, `compact`, `onPlay/onPause/onEnded`
- **IntersectionObserver** threshold 0.5: autoplay muted khi ≥50% visible, pause khi rời viewport
- **Manual pause tracking**: Nếu user chủ động pause, không auto-resume khi scroll lại
- **Overlay controls**: Play/Pause lớn ở giữa, seek scrubber, current time/duration, volume slider (desktop), settings menu (speed 0.5–2x, fit mode contain/cover), fullscreen toggle
- **Auto-hide controls** sau ~2.5s không tương tác (desktop hover, mobile tap toggle)
- **Compact mode**: Controls tối giản (play/mute/fullscreen) cho grid cells
- **Keyboard shortcuts**: Space (play/pause), Left/Right (seek ±5s), M (mute), F (fullscreen)
- **HLS support**: Dùng `hls.js` cho Chrome, native fallback cho Safari. Quality switching giữ currentTime
- **Buffering spinner** khi waiting/stalled/seeking
- **Aspect ratio**: Giữ nguyên tỷ lệ portrait/landscape/square, `object-contain` mặc định với letterbox tối, max-height ~70vh cho single video
- **Cleanup**: Hủy tất cả listeners, observers, timers, RAF, HLS instance khi unmount
- **Accessibility**: aria-label cho buttons, keyboard reachable, focus ring

### 2. CẬP NHẬT: `src/components/feed/MediaGrid.tsx`

- Thay `FeedVideo` bằng `FacebookVideoPlayer` trong feed
- Single video (media.length === 1): dùng `FacebookVideoPlayer` với `className="w-full max-h-[70vh] bg-black"`
- Grid cells (2/3/4+): dùng `FacebookVideoPlayer` với `compact` mode
- Giữ nguyên logic cho chunked manifest URLs (LiveReplay)
- Giữ nguyên `LazyImage` cho ảnh
- Gallery viewer giữ nguyên `SocialVideoPlayer` (không thay đổi)

### 3. KHÔNG thay đổi

- `SocialVideoPlayer.tsx` — giữ nguyên cho gallery viewer và các nơi khác
- `LazyVideo.tsx` — giữ nguyên file, không xóa (rollback dễ dàng)
- `LivePostCard` / `StreamPlayer` — không ảnh hưởng
- Backend / DB schema — không thay đổi

---

## Chi tiết kỹ thuật

### Aspect Ratio Strategy
```text
┌──────────────────────────┐
│    dark letterbox fill    │
│  ┌────────────────────┐  │
│  │                    │  │
│  │   video (contain)  │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
└──────────────────────────┘
max-height: 70vh (single)
object-fit: contain (default) | cover (toggle)
```

### HLS Flow
```text
src → is .m3u8? → YES → Safari native? → YES → video.src = url
                                        → NO  → hls.js attach
              → NO  → standard <video src={url}>
```

### Behavior Matrix

| Scenario | Behavior |
|---|---|
| ≥50% visible | Autoplay muted (nếu chưa manual pause) |
| Rời viewport | Pause |
| User manual pause | Không auto-resume cho đến khi user bấm play |
| Desktop hover | Hiện controls, auto-hide sau 2.5s |
| Mobile tap | Toggle controls visibility |
| Compact mode | Chỉ play/mute/fullscreen |

---

## Tóm tắt

| File | Hành động |
|------|-----------|
| `src/components/ui/FacebookVideoPlayer.tsx` | Tạo mới |
| `src/components/feed/MediaGrid.tsx` | Cập nhật: dùng FacebookVideoPlayer thay FeedVideo |

