

# Sửa Lỗi Live Replay Video Không Phát & Gây Chậm Máy

## Nguyên nhân phát hiện

Sau khi kiểm tra kỹ `ChunkedVideoPlayer.tsx` và các component liên quan, tìm thấy **3 bug chính**:

### Bug 1: Scheduler không dừng khi lỗi → chậm máy
Khi chunks fail (CORS, 404...), `setError(...)` được gọi nhưng `setInterval(schedulerTick, 350ms)` **vẫn chạy mãi**. Scheduler tiếp tục gọi `enqueueWindowByTime`, `pumpFetchQueue`, `evictBuffer`... mỗi 350ms, gây CPU waste nghiêm trọng.

### Bug 2: `formatDurationTime(0)` hiện "---:--" thay vì "0:00"
Hàm kiểm tra `seconds <= 0` nên time=0 bị trả về "--:--". Gây UX khó hiểu trên progress bar.

### Bug 3: Video `<video>` thiếu `muted` → browser chặn decode
Một số browser chặn hoặc giới hạn media decoding khi video không có attribute `muted`. Dù `autoPlay=false`, việc thiếu `muted` có thể gây lỗi play trên mobile.

---

## Thay đổi

### File 1: `src/modules/live/components/ChunkedVideoPlayer.tsx`
- Thêm biến `hasError` trong closure, set `true` khi gọi `setError`
- `schedulerTick` kiểm tra `hasError` → `clearInterval` và return sớm
- `pumpFetchQueue` kiểm tra `hasError` → return sớm
- Thêm `clearInterval(schedulerId)` khi error xảy ra
- Thêm `muted` và `preload="metadata"` cho `<video>` element
- Cleanup: gán `video.src = ''` khi destroy để giải phóng bộ nhớ

### File 2: `src/lib/formatters.ts`
- Sửa `seconds <= 0` thành `seconds < 0` để time=0 hiện "0:00"

### File 3: `pdk/core/lib/formatters.ts`
- Sửa tương tự (bản copy)

---

## Kết quả mong đợi
- Video replay phát được bình thường
- Không còn scheduler chạy vô hạn khi lỗi → máy không bị chậm
- Progress bar hiện "0:00 / 0:40" thay vì "---:-- / 0:40"

