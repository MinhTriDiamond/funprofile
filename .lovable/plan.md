

# Chỉnh UI Video trong Feed theo kiểu Facebook

## Phân tích hiện tại

**FeedVideoPlayer** hiện có 2 mode:
- `displayMode="square"` — dùng cho multi-media grid (2+ media), đã có `aspect-square`
- `displayMode="rectangle"` — dùng cho single video post, **KHÔNG** có aspect-square → video tự co theo tỷ lệ gốc

**Vấn đề chính**: Single video (bao gồm live replay) dùng `displayMode="rectangle"` nên **không có khung 1:1**. Blur backdrop chỉ hiện khi `isPortrait === true AND resolvedObjectFit === 'contain'` — nhưng logic hiện tại cho rectangle mode luôn set `resolvedObjectFit = 'contain'` mà **không bật backdrop** vì `showBackdrop` chỉ check `isPortrait === true`.

**ChunkedVideoPlayer** (live replay) render trong `SocialVideoPlayer` wrapper — controls hoạt động nhưng video nằm trong khung rectangle, không phải 1:1.

## Thay đổi

### File 1: `src/components/feed/FeedVideoPlayer.tsx`

**Mục tiêu**: Mọi video trong feed luôn hiển thị trong khung 1:1 với blur backdrop kiểu Facebook.

1. **Bỏ phân biệt square/rectangle cho wrapper**: Container luôn `aspect-square rounded-xl bg-black overflow-hidden`
2. **Blur backdrop luôn hiện** cho cả portrait và landscape: 
   - Layer 1: poster hoặc video duplicate, `object-cover scale-110 blur-2xl opacity-35`
   - Layer 2: video chính, `object-contain` (luôn luôn)
3. **Bỏ logic `fitStrategy`** phức tạp — luôn dùng `object-contain` để không crop
4. **Giữ nguyên** LIVE Replay badge, download button, coordinator logic
5. **Truyền `objectFit="contain"`** cố định cho cả `FacebookVideoPlayer` và `ChunkedVideoPlayer`

### File 2: `src/components/feed/MediaGrid.tsx`

- Single video: đổi `displayMode="rectangle"` → `displayMode="square"` (hoặc bỏ prop vì default đã là square)
- Multi-media video: giữ nguyên `displayMode="square"`

### Không sửa
- `FacebookVideoPlayer.tsx` — giữ nguyên, chỉ nhận `objectFit` prop từ FeedVideoPlayer
- `SocialVideoPlayer.tsx` — giữ nguyên (controls đã fix ở lần trước)
- `ChunkedVideoPlayer.tsx` — giữ nguyên
- Backend / recording logic — không đụng

## Kết quả mong đợi
- Video dọc 9:16: hiện full trong khung 1:1, hai bên có blur backdrop
- Video ngang 16:9: hiện full trong khung 1:1, trên dưới có blur backdrop  
- Live replay: cùng khung 1:1 nhất quán, controls hiện rõ
- Nhìn giống Facebook feed

