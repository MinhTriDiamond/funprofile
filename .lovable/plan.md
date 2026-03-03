

# Sửa lỗi Live Replay: Tải chậm và Controls bị ẩn

## Phân tích vấn đề

### Vấn đề 1: Video tải quá lâu
Khi MSE thất bại (SourceBuffer error ở chunk đầu tiên), hệ thống chuyển sang **blob fallback** — tải **TOÀN BỘ** chunks tuần tự rồi mới phát. Với 9 chunks (~36 giây video), user phải chờ tải xong 100% mới xem được. Đây là nguyên nhân chính gây chờ lâu.

### Vấn đề 2: Controls video không hiển thị
`SocialVideoPlayer` có cơ chế auto-hide controls sau 3 giây khi video đang phát. Ngoài ra, khi blob fallback hoàn tất và `autoPlay` kích hoạt, video bắt đầu phát ngay → controls bị ẩn trước khi user kịp thấy. User cần tap/click vào video để hiện controls nhưng có thể không biết điều này.

## Giải pháp

### 1. Blob fallback: Phát ngay khi có thể thay vì chờ tải hết

**File**: `src/modules/live/components/ChunkedVideoPlayer.tsx`

Thay đổi `loadWithBlob` để:
- Sau khi tải xong chunk đầu tiên, tạo blob tạm và set làm `video.src` → video hiện frame đầu tiên ngay
- Tiếp tục tải các chunk còn lại ở background
- Khi tải xong tất cả, ghép thành blob hoàn chỉnh và thay thế src
- Set `loading = false` sau chunk đầu tiên thay vì sau chunk cuối

Cụ thể:
```
- Tải chunk 0 → tạo partial blob → video.src = blobUrl → setLoading(false)
- Tải chunk 1..N ở background, cập nhật progress
- Khi xong hết → ghép full blob → video.src = fullBlobUrl (seamless)
```

### 2. Controls luôn hiện khi video pause

**File**: `src/components/ui/SocialVideoPlayer.tsx`

- Khi video ở trạng thái pause (chưa play lần nào), giữ `showOverlay = true` và không schedule auto-hide
- Thêm logic: nếu `!isPlaying && !isEnded` → luôn hiện controls (nút Play lớn ở giữa + bottom bar)
- Đảm bảo sau khi blob fallback load xong, controls hiển thị rõ ràng cho user biết có thể nhấn Play

### 3. Tối ưu UX loading

**File**: `src/modules/live/components/ChunkedVideoPlayer.tsx`

- Khi đang trong blob fallback, hiển thị text "Đang tải video..." thay vì chỉ spinner + %
- Khi chunk đầu tiên đã load xong nhưng còn tải tiếp, hiện progress bar nhỏ ở top thay vì overlay toàn màn hình

## File thay đổi
- `src/modules/live/components/ChunkedVideoPlayer.tsx` — Blob fallback phát sớm + UX loading
- `src/components/ui/SocialVideoPlayer.tsx` — Controls luôn hiện khi pause

