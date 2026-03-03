

# Giảm 80-90% Video Elements trên trang Profile

## Phân tích hiện tại

Mỗi bài video trên trang profile tạo tối thiểu **2 video elements** (backdrop + player chính). Trang có 20 bài video = 40 video elements, tất cả đều tải đồng thời dù user chỉ nhìn thấy 2-3 bài trên màn hình.

## Phương án tối ưu mạnh (3 lớp)

### Lớp 1: Bỏ backdrop video (giảm ~50%)
- Khi không có `poster`, thay `<video>` backdrop bằng CSS gradient tối
- Khi có `poster`, giữ `<img>` (nhẹ, không tốn RAM)

### Lớp 2: Lazy mount video - CHỈ tạo video element khi gần viewport (giảm thêm ~80%)
**Đây là thay đổi lớn nhất.** Thay vì render `FacebookVideoPlayer` / `ChunkedVideoPlayer` cho MỌI bài post, chỉ render khi bài post nằm gần viewport (IntersectionObserver với `rootMargin: "200px"`).

- Bài post **ngoài viewport**: hiển thị ảnh poster tĩnh + icon Play overlay (không tạo video element)
- Bài post **trong/gần viewport**: mount video player thật

Kết quả: Trang 20 video chỉ tạo **3-4 video elements** thay vì 40.

### Lớp 3: Gallery thumbnails dùng poster/icon thay vì video (giảm thêm N elements)
- Thumbnail 48x48 trong gallery viewer: dùng poster image hoặc icon Play trên nền tối
- Không tải full video chỉ để hiện preview nhỏ

## Chi tiết kỹ thuật

### File 1: `src/components/feed/FeedVideoPlayer.tsx`

Thêm IntersectionObserver vào component:

```text
const [isNearViewport, setIsNearViewport] = useState(false)
const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const el = containerRef.current
  if (!el) return
  const obs = new IntersectionObserver(
    ([entry]) => setIsNearViewport(entry.isIntersecting),
    { rootMargin: '200px' }
  )
  obs.observe(el)
  return () => obs.disconnect()
}, [])
```

Khi `!isNearViewport`:
- Render poster image + Play icon (nhẹ, chỉ 1 img element)
- Không mount FacebookVideoPlayer hay ChunkedVideoPlayer

Khi `isNearViewport`:
- Mount video player thật (như hiện tại)

Backdrop layer: bỏ `<video>` fallback, thay bằng gradient.

### File 2: `src/components/feed/MediaGrid.tsx`

Gallery viewer thumbnails (dòng 450-454): thay `<video>` bằng poster hoặc icon Play.

## Kết quả mong đợi

| Tình huống | Trước | Sau | Giảm |
|---|---|---|---|
| 20 bài video, không poster | 40 video elements | 3-4 elements | ~90% |
| 20 bài video, có poster | 20 video elements | 3-4 elements | ~85% |
| Gallery 10 video thumbnails | 10 video elements | 0 elements | 100% |

## Không thay đổi
- Backend, recording logic
- FacebookVideoPlayer, SocialVideoPlayer, ChunkedVideoPlayer (internal)
- Chất lượng phát video khi user thực sự xem

