

# Khắc phục: Video Replay dài phải tải 100% mới phát được

## Nguyên nhân gốc

`ChunkedVideoPlayer` hiện tại tải **TẤT CẢ chunks** (ví dụ 483 chunks cho video 32 phút) rồi mới gộp thành 1 blob để phát. Người dùng phải chờ từ 0% → 100% trước khi xem được bất kỳ frame nào.

```text
Hiện tại:
[Chunk 1] → [Chunk 2] → ... → [Chunk 483] → Gộp blob → Phát video
                    ↑ Chờ 100% ↑

Sau khi sửa:
[Chunk 1..3] → Phát ngay! → Tải thêm chunks nền → Phát liên tục
   ↑ ~12 giây ↑
```

## Giải pháp: MediaSource Extensions (MSE) - Streaming Progressive

Sử dụng `MediaSource API` để bắt đầu phát video ngay sau khi tải vài chunks đầu tiên, trong khi tiếp tục tải các chunks còn lại ở background.

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/modules/live/components/ChunkedVideoPlayer.tsx` | Viết lại logic: dùng MediaSource API để append chunks vào SourceBuffer ngay khi tải xong, cho phép phát video progressive. Fallback về blob concatenation nếu MSE không hỗ trợ codec. |

## Chi tiết kỹ thuật

### Luồng mới trong ChunkedVideoPlayer:

1. Fetch `manifest.json` → parse danh sách chunks
2. Tạo `MediaSource` object, gán `URL.createObjectURL(mediaSource)` vào video.src
3. Khi `sourceopen` event:
   - Tạo `SourceBuffer` với codec từ manifest (vd: `video/webm; codecs="vp8,opus"`)
   - Bắt đầu tải chunk 1, append vào SourceBuffer
   - Gọi `onReady` + `video.play()` ngay sau chunk đầu tiên
   - Tiếp tục tải từng chunk tiếp theo, append vào buffer
   - Khi hết chunks → gọi `mediaSource.endOfStream()`
4. Fallback: Nếu `MediaSource.isTypeSupported()` trả false → dùng logic blob cũ (tải hết rồi phát)
5. Hiển thị trạng thái: thay vì "Đang tải video... X%", chỉ hiển thị spinner nhỏ khi đang tải chunk đầu tiên, sau đó ẩn loading overlay

### Xử lý edge cases:
- **SourceBuffer busy**: Queue chunks và append khi `updateend` event fire
- **Seeking**: Nếu user tua tới vùng chưa tải, hiển thị buffering spinner
- **Lỗi mạng**: Retry tải chunk bị lỗi (tối đa 3 lần)
- **Codec không hỗ trợ MSE**: Fallback về blob concatenation (giữ logic cũ)

