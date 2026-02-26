

# Nang cap Video Player cho FUN Profile

## Tong quan

Tao component `SocialVideoPlayer` moi, thay the native `controls` o tat ca cac player hien tai (LazyVideo, ChunkedVideoPlayer, Gallery viewer). Player moi se co giao dien chuyen nghiep kieu Facebook/YouTube mini player.

## Cac file thay doi

### 1. TAO MOI: `src/components/ui/SocialVideoPlayer.tsx`

Component chinh — custom video controls overlay bao quanh mot `<video>` element (truyen vao qua ref hoac children).

**Chuc nang:**
- **Progress bar**: thanh progress thuc dua tren `timeupdate` event, hien thi buffered range, ho tro click/drag de seek
- **Thoi gian**: hien thi `currentTime / duration` (format mm:ss hoac hh:mm:ss), dung `formatDurationTime` tu `src/lib/formatters.ts`
- **Controls overlay**: hien/an khi hover (desktop) hoac tap (mobile), tu dong an sau 3 giay
- **Nut trung tam**: Play/Pause icon lon o giua video
- **Thanh controls duoi**: play/pause, progress bar co seek, time display, volume slider (desktop), mute toggle, toc do phat (0.5x-2x), fullscreen, PiP
- **Mobile UX**: tap 1 lan show controls, double-tap trai/phai tua +-10s, progress bar lon hon de de keo
- **Ket thuc video**: hien nut Replay
- **Skeleton loading**: hien skeleton khi video chua load xong

**Khong lam:**
- Mini floating player (phuc tap, chua can thiet)
- Double tap heart reaction (khong lien quan den player)
- Adaptive streaming HLS (da co StreamPlayer xu ly rieng)

### 2. CAP NHAT: `src/components/ui/LazyVideo.tsx`

- Thay `controls={showControls}` native bang `SocialVideoPlayer` wrapper
- Truyen videoRef vao SocialVideoPlayer de no dieu khien video element
- Giu nguyen logic lazy load, IntersectionObserver, Stream/Chunked routing

### 3. CAP NHAT: `src/modules/live/components/ChunkedVideoPlayer.tsx`

- Thay `controls={controls}` native bang `SocialVideoPlayer` wrapper
- Truyen videoRef de SocialVideoPlayer dieu khien

### 4. CAP NHAT: `src/components/feed/MediaGrid.tsx`

- Gallery viewer (dong 466-473): thay native `<video controls>` bang `SocialVideoPlayer`
- FeedVideo component: khong can doi (da delegate xuong LazyVideo/ChunkedVideoPlayer)

### 5. CAP NHAT: `src/components/reels/ReelPlayer.tsx`

- Them SocialVideoPlayer wrapper cho reel playback (tuy chon, chi can progress + time)

## Chi tiet ky thuat cua SocialVideoPlayer

```text
Props:
- videoRef: RefObject<HTMLVideoElement>  (bat buoc)
- showControls?: boolean (default true)
- autoHideMs?: number (default 3000)
- className?: string
- children?: ReactNode (video element)

Internal state:
- isPlaying, currentTime, duration, buffered, volume, isMuted
- isFullscreen, playbackRate, showOverlay, isEnded
- isSeeking (khi drag progress bar)

Events lang nghe tren video element:
- loadedmetadata -> set duration
- timeupdate -> set currentTime, tinh progress %
- progress -> set buffered ranges
- play/pause -> set isPlaying
- ended -> set isEnded, hien Replay
- volumechange -> sync volume/muted state

Progress bar:
- progressPercent = (currentTime / duration) * 100
- Chi render khi duration > 0 va !isNaN(duration)
- Buffered: lay video.buffered.end(video.buffered.length - 1)
- Click/drag: tinh vi tri % -> video.currentTime = % * duration

Double-tap mobile:
- Phat hien 2 tap trong 300ms
- Tap nua trai: currentTime -= 10
- Tap nua phai: currentTime += 10
- Hien animation "+10s" / "-10s"
```

## Thu tu trien khai

1. Tao `SocialVideoPlayer.tsx` (component doc lap, tu test duoc)
2. Tich hop vao `LazyVideo.tsx` (anh huong tat ca video thuong trong feed)
3. Tich hop vao `ChunkedVideoPlayer.tsx` (anh huong tat ca live replay)
4. Cap nhat Gallery viewer trong `MediaGrid.tsx`
5. (Tuy chon) Cap nhat `ReelPlayer.tsx`

## Ket qua ky vong

- Progress bar chinh xac tu 0% den 100%
- Hien thi currentTime / duration ro rang
- Seek muot bang click hoac drag
- Controls tu dong an, xuat hien khi tuong tac
- Hoat dong tot tren mobile va desktop
- Khong gay memory leak (cleanup event listeners)
- Khong anh huong video upload hay livestream dang phat

