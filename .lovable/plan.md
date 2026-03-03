
# Sửa lỗi Live Replay không phát được video (SourceBuffer Error)

## Phát hiện qua Testing

Video player **hiển thị đúng** (badge LIVE Replay, thời lượng 0:36, nút download). URL normalization từ `r2.dev` → `media.fun.rich` **hoạt động tốt** — tất cả 9 chunks tải thành công (status 200, ~40ms mỗi chunk). Tuy nhiên video **không phát** vì `SourceBuffer error` khi append chunk đầu tiên.

## Nguyên nhân gốc

Khi `appendBuffer(chunk_0)` fail, flow hiện tại:
1. `sbErrorCount = 1`, `nextAppendSeq` tăng lên 1
2. `processQueue()` cố append chunk 1 — nhưng chunk 1 **không có WebM init segment** (EBML header + track info) vì chỉ chunk 0 mới có
3. MediaSource có thể chuyển sang trạng thái `closed` sau error, khiến `processQueue` return sớm tại check `mediaSource.readyState !== 'open'`
4. Player bị stuck — không bao giờ đạt `MAX_SB_ERRORS = 3` để trigger blob fallback

Nguyên nhân SourceBuffer reject chunk 0: có thể do **codec mismatch** — manifest ghi `vp8,opus` nhưng MediaRecorder thực tế có thể encode bằng `vp9` hoặc codec khác tùy trình duyệt.

## Giải pháp

### Sửa ChunkedVideoPlayer.tsx — Fast blob fallback khi first chunk fails

**Nguyên tắc**: Nếu chunk đầu tiên (chứa init segment) bị reject bởi SourceBuffer, thì MSE sẽ **không bao giờ** hoạt động cho recording này. Phải fallback sang blob ngay lập tức thay vì chờ 3 errors.

**Thay đổi cụ thể**:
1. Trong SourceBuffer `error` event handler (line 312-321): thêm check `if (!firstChunkAppended)` → gọi `onFallback()` ngay lập tức, không cần đợi `MAX_SB_ERRORS`
2. Trong `appendBuffer` catch block (line 279-294): tương tự, nếu `!firstChunkAppended` → fallback ngay

Blob fallback (line 514-541) sẽ download tất cả chunks, ghép thành 1 blob, dùng native `<video>` element — hoạt động với mọi codec mà trình duyệt hỗ trợ.

### Cải thiện MIME detection (tùy chọn)

Thêm logic thử nhiều MIME type: nếu `vp8,opus` không được support bởi `MediaSource.isTypeSupported()`, thử `vp9,opus`, rồi `video/webm` không có codec string. Điều này giúp MSE hoạt động đúng cho recordings từ các trình duyệt khác nhau.

## File thay đổi

- `src/modules/live/components/ChunkedVideoPlayer.tsx`

## Tác động

- Tất cả live replay hiện có sẽ phát được (qua blob fallback nếu MSE thất bại)
- Không ảnh hưởng đến recordings mới nếu MSE hoạt động đúng
- Blob fallback chỉ tốn thêm vài giây load (download toàn bộ trước khi phát)
