

# Nguyên nhân và Giải pháp: Video Live Replay dừng phát sau một lúc

## Nguyên nhân gốc

`ChunkedVideoPlayer` hiện tại sử dụng MSE (MediaSource Extensions) để phát progressive, nhưng có **2 lỗi nghiêm trọng**:

### 1. SourceBuffer QuotaExceededError (lỗi chính)
Trình duyệt giới hạn dung lượng SourceBuffer (thường khoảng 100-150MB). Với video dài (30 phút = ~483 chunks), player cứ append tất cả chunks vào SourceBuffer mà **không bao giờ xóa dữ liệu cũ**. Khi buffer đầy → `appendBuffer()` throw `QuotaExceededError` → không có error handler → video dừng, không hiển thị hình.

```text
[Chunk 1][Chunk 2]...[Chunk 100] → Buffer đầy → QuotaExceededError → ❌ Video chết
```

### 2. Không có error listener trên SourceBuffer
Khi SourceBuffer gặp lỗi (quota, decode error), không có `onerror` handler → lỗi bị nuốt, UI vẫn hiện video tag nhưng không còn frame nào → màn hình đen/trống.

## Giải pháp: Buffer Management + Error Recovery

### File cần sửa

| File | Thay đổi |
|------|----------|
| `src/modules/live/components/ChunkedVideoPlayer.tsx` | Thêm buffer management: tự động xóa dữ liệu cũ khi buffer lớn. Thêm error handling cho SourceBuffer. Thêm buffering indicator khi user tua. |

### Chi tiết kỹ thuật

1. **Buffer cleanup**: Trước khi append chunk mới, kiểm tra tổng buffered data. Nếu vượt ngưỡng (ví dụ 60MB hoặc 60 giây trước `currentTime`), gọi `sourceBuffer.remove(start, end)` để giải phóng vùng đã phát qua.

2. **QuotaExceededError handling**: Wrap `appendBuffer()` trong try-catch. Khi gặp QuotaExceeded:
   - Xóa buffer cũ (trước currentTime - 30s)
   - Retry append sau khi `updateend`

3. **SourceBuffer error listener**: Thêm `sourceBuffer.addEventListener('error', ...)` để bắt decode errors, set trạng thái lỗi cho UI.

4. **Buffering indicator**: Lắng nghe `video.waiting` event để hiện spinner khi video đang đợi data (ví dụ khi user tua tới vùng chưa tải).

5. **Lazy chunk loading**: Chỉ tải chunks xung quanh vị trí phát hiện tại (buffer ahead ~30s). Khi user tua, tính lại chunk cần tải. Điều này giảm tải mạng và bộ nhớ đáng kể cho video dài.

```text
Sau khi sửa:
Video 30 phút, user đang xem phút 15:
[...đã xóa...][Chunk 220..230 trong buffer][đang tải Chunk 231..240]
                     ↑ currentTime              ↑ buffer ahead ~30s
```

