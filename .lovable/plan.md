

# Tích hợp Live Video Recording — Chunked Recording & Upload

## ✅ Hoàn thành

Tất cả các bước đã được triển khai thành công:

### Bước 1: ✅ Tạo `crashRecovery.ts`
- IndexedDB-based backup: `initRecoverySession`, `saveChunkKey`, `getPendingRecovery`, `clearRecovery`

### Bước 2: ✅ Cập nhật `chunkedRecorder.ts`
- Functional API `createChunkedRecorder` thay thế class cũ
- Tách biệt recording khỏi upload (emit chunk qua callback `onChunk`)

### Bước 3: ✅ Cập nhật `chunkUploadQueue.ts`
- Functional API `createChunkUploadQueue` với `uploadFn` injection
- Offline-aware + exponential backoff retry

### Bước 4: ✅ Cập nhật `clientRecorder.ts`
- Thêm `videoBitsPerSecond` (1.5Mbps) và `audioBitsPerSecond` (64kbps)

### Bước 5: ✅ Thêm `uploadLiveChunk` và `finalizeLiveChunks` vào `liveService.ts`
- POST chunk binary đến Worker `/upload/live-chunk`
- POST JSON đến Worker `/upload/live-finalize`

### Bước 6: ✅ Tạo `useLiveRecording.ts`
- React hook điều phối: chunkedRecorder + chunkUploadQueue + crashRecovery
- Auto-start, beforeunload warning, cleanup on unmount

### Bước 7: ✅ Cập nhật `LiveHostPage.tsx`
- Sử dụng `useLiveRecording` hook thay vì `ChunkedRecordingManager` class
- Giữ nguyên fallback legacy single-blob path
