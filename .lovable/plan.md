

# Tích hợp Live Video Recording — Chunked Recording & Upload

## Tình trạng hiện tại

Dự án đã có sẵn hệ thống chunked recording nhưng **thiếu một số thành phần quan trọng** so với spec:

| Thành phần | Hiện tại | Spec yêu cầu |
|---|---|---|
| `chunkedRecorder.ts` | ✅ Class-based `ChunkedRecordingManager` | Functional `createChunkedRecorder` |
| `chunkUploadQueue.ts` | ✅ Class `ChunkUploadQueue` (signed URL) | Functional `createChunkUploadQueue` (Worker direct) |
| `clientRecorder.ts` | ✅ Đã có | Cập nhật thêm `videoBitsPerSecond`, `audioBitsPerSecond` |
| `crashRecovery.ts` | ❌ Chưa có | IndexedDB backup/recovery |
| `useLiveRecording.ts` | ❌ Chưa có | React hook điều phối toàn bộ |
| `uploadLiveChunk` / `finalizeLiveChunks` | ❌ Chưa có trong liveService | Upload chunk + ghép file qua Worker |

**Lưu ý quan trọng:** `LiveHostPage.tsx` đang import và sử dụng `ChunkedRecordingManager` class. Cần cập nhật để dùng hook `useLiveRecording` mới.

## Kế hoạch thực hiện

### Bước 1: Tạo `crashRecovery.ts` (file mới)
- IndexedDB-based backup: `initRecoverySession`, `saveChunkKey`, `getPendingRecovery`, `clearRecovery`
- Lưu chunk keys vào IndexedDB để phục hồi nếu browser crash

### Bước 2: Cập nhật `chunkedRecorder.ts`
- Thay thế class `ChunkedRecordingManager` bằng functional API `createChunkedRecorder`
- Interface: `ChunkMeta`, `ChunkedRecorderOptions`, `ChunkedRecorderController`
- Tách biệt recording khỏi upload (chỉ emit chunk qua callback `onChunk`)

### Bước 3: Cập nhật `chunkUploadQueue.ts`
- Thay thế class `ChunkUploadQueue` bằng functional API `createChunkUploadQueue`
- Hỗ trợ offline-aware (chờ `online` event)
- Retry với exponential backoff
- `uploadFn` injection thay vì hardcode signed URL logic

### Bước 4: Cập nhật `clientRecorder.ts`
- Thêm options `videoBitsPerSecond` (1.5Mbps) và `audioBitsPerSecond` (64kbps)

### Bước 5: Thêm `uploadLiveChunk` và `finalizeLiveChunks` vào `liveService.ts`
- `uploadLiveChunk`: POST chunk binary đến Worker `/upload/live-chunk`
- `finalizeLiveChunks`: POST JSON đến Worker `/upload/live-finalize` để ghép chunks thành 1 file .webm
- Sử dụng `VITE_AGORA_WORKER_URL` (đã có sẵn trong hệ thống)

### Bước 6: Tạo `src/hooks/live/useLiveRecording.ts` (file mới)
- React hook điều phối: chunkedRecorder + chunkUploadQueue + crashRecovery
- Lấy MediaStream từ Agora tracks (`videoTrack.getMediaStreamTrack()`)
- Auto-start khi tracks sẵn sàng
- `stop()`: dừng recorder, `finalize()`: flush queue + ghép file
- `beforeunload` warning khi đang recording
- Expose: `phase`, `chunkCount`, `uploadStats`, `start`, `stop`, `finalize`

### Bước 7: Cập nhật `LiveHostPage.tsx`
- Thay thế import `ChunkedRecordingManager` bằng `useLiveRecording` hook
- Đơn giản hóa logic recording: hook tự quản lý lifecycle
- Giữ nguyên fallback `clientRecorder` (legacy single-blob path)

## Tệp cần thay đổi

| Tệp | Hành động |
|------|-----------|
| `src/modules/live/recording/crashRecovery.ts` | **Tạo mới** |
| `src/modules/live/recording/chunkedRecorder.ts` | Thay thế nội dung |
| `src/modules/live/recording/chunkUploadQueue.ts` | Thay thế nội dung |
| `src/modules/live/recording/clientRecorder.ts` | Cập nhật nhỏ |
| `src/modules/live/liveService.ts` | Thêm 2 hàm mới |
| `src/hooks/live/useLiveRecording.ts` | **Tạo mới** |
| `src/modules/live/pages/LiveHostPage.tsx` | Refactor dùng hook mới |

