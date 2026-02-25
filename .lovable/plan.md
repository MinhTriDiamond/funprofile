

# Nâng cấp Recording: Chunked Upload + Resume + Manifest (Production MVP)

## Audit hiện trạng

### Cách recording hiện tại hoạt động

1. **Recording**: `clientRecorder.ts` dùng `MediaRecorder` với `timesliceMs=1500ms`. Tất cả chunk được **giữ trong RAM** (`chunks: BlobPart[]`). Khi stop, gom thành 1 Blob lớn.

2. **Upload**: `LiveHostPage.tsx` dòng 347-378:
   - Stop recorder → lấy Blob
   - Nén video (`compressVideo`)
   - Upload 1 file duy nhất qua `uploadToR2()` (presigned URL nếu <50MB, multipart nếu ≥50MB)

3. **Format**: `video/webm;codecs=vp8,opus` hoặc `video/webm`

4. **Retry/backoff**: Có retry 3 lần cho multipart parts (`multipartUpload.ts`), nhưng **không có retry cho single upload**

### Điểm fail khi live dài

| Vấn đề | Chi tiết |
|--------|----------|
| **Memory** | Tất cả chunk giữ trong `chunks[]` array → RAM tăng liên tục. Live 30 phút ≈ 200-500MB RAM |
| **Single upload** | Một blob lớn upload cuối cùng, nếu fail thì mất hết |
| **Page visibility** | Mobile PWA background → MediaRecorder có thể bị pause/stop |
| **Network** | Không có resume, không checkpoint. Fail = mất toàn bộ |
| **Timeout** | `uploadWithPresignedUrl` timeout 120s → quá nhỏ cho video lớn |

---

## Kiến trúc mới: Chunked Recording + Resumable Upload

```text
┌─────────────────────────────────────────────────┐
│                  Browser (Host)                  │
│                                                  │
│  MediaRecorder (timeslice=4s)                    │
│       │                                          │
│       ▼                                          │
│  ChunkedRecordingManager                         │
│  ┌──────────────────────────────────────┐       │
│  │ ondataavailable → enqueue chunk      │       │
│  │ UploadQueue (concurrency=2, retry=3) │       │
│  │   │                                  │       │
│  │   ├─ GET signed URL (edge fn)        │       │
│  │   ├─ PUT chunk to R2                 │       │
│  │   └─ UPDATE DB checkpoint            │       │
│  │                                      │       │
│  │ localStorage: { recordingId }        │       │
│  │ Online/Offline listener → pause/resume│      │
│  │ visibilitychange → flush queue       │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  "Kết thúc Live" → stop recorder                │
│                   → flush remaining chunks       │
│                   → call recording-finalize      │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│              Edge Functions                      │
│                                                  │
│  r2-signed-chunk-url                             │
│    - Auth check (JWT)                            │
│    - Validate recording ownership                │
│    - Return presigned PUT URL (60s expiry)       │
│    - Key: recordings/{id}/chunks/{seq}.webm      │
│                                                  │
│  recording-finalize                              │
│    - Read chunks from DB                         │
│    - Build manifest.json → upload to R2          │
│    - Generate HLS-like playlist (MVP)            │
│    - Create post on feed                         │
│    - Update live_recordings status = done        │
└─────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│         Cloudflare R2 Storage                    │
│                                                  │
│  recordings/{recording_id}/                      │
│    chunks/0000.webm                              │
│    chunks/0001.webm                              │
│    ...                                           │
│    manifest.json                                 │
│    output.webm (future: concatenated)            │
└─────────────────────────────────────────────────┘
```

---

## Chi tiết triển khai

### Phase 1: Database Migration

**Bảng mới: `chunked_recordings`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Recording ID |
| user_id | uuid NOT NULL | Owner |
| live_session_id | uuid | FK to live_sessions |
| channel_name | text | Agora channel |
| status | text | `recording`, `uploading`, `assembling`, `done`, `failed` |
| codec | text | e.g. `vp8,opus` |
| mime_type | text | e.g. `video/webm` |
| width | int | Video width |
| height | int | Video height |
| total_chunks | int | Total chunk count (set on finalize) |
| last_seq_uploaded | int DEFAULT -1 | Checkpoint for resume |
| output_object_key | text | Final assembled file key |
| output_url | text | Public playback URL |
| error_message | text | Last error |
| started_at | timestamptz | Recording start |
| ended_at | timestamptz | Recording end |
| created_at | timestamptz DEFAULT now() | |

**Bảng mới: `chunked_recording_chunks`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| recording_id | uuid FK | FK to chunked_recordings |
| seq | int NOT NULL | Sequence number (0-based) |
| object_key | text | R2 path |
| bytes | int | Chunk size |
| duration_ms | int | Chunk duration |
| status | text | `pending`, `uploading`, `uploaded`, `failed` |
| uploaded_at | timestamptz | |
| created_at | timestamptz DEFAULT now() | |

**UNIQUE constraint**: `(recording_id, seq)`

**RLS**: 
- SELECT/INSERT/UPDATE: `auth.uid() = user_id` (via join on `chunked_recordings`)
- Enable realtime cho `chunked_recordings`

### Phase 2: Edge Function — `r2-signed-chunk-url`

**Endpoint**: `POST /functions/v1/r2-signed-chunk-url`

**Request**:
```json
{
  "recording_id": "uuid",
  "seq": 0,
  "contentType": "video/webm",
  "fileSize": 65536
}
```

**Logic**:
1. Auth check (JWT)
2. Verify `recording_id` belongs to user (query `chunked_recordings`)
3. Generate presigned PUT URL cho key `recordings/{recording_id}/chunks/{seq.toString().padStart(4,'0')}.webm`, expire 60s
4. Return `{ uploadUrl, objectKey }`

**Rate limit**: Max 60 requests/minute per user (1 chunk mỗi giây là quá đủ)

### Phase 3: Edge Function — `recording-finalize`

**Endpoint**: `POST /functions/v1/recording-finalize`

**Request**:
```json
{
  "recording_id": "uuid",
  "live_session_id": "uuid"
}
```

**Logic**:
1. Auth check
2. Query all chunks from `chunked_recording_chunks` WHERE `recording_id` AND `status='uploaded'` ORDER BY `seq`
3. Build `manifest.json`:
   ```json
   {
     "recording_id": "...",
     "codec": "vp8,opus",
     "mime_type": "video/webm",
     "chunks": [
       { "seq": 0, "key": "recordings/.../chunks/0000.webm", "bytes": 65536, "duration_ms": 4000 },
       ...
     ],
     "total_duration_ms": 120000,
     "created_at": "..."
   }
   ```
4. Upload `manifest.json` to R2 at `recordings/{recording_id}/manifest.json`
5. **MVP Playback**: Dùng chunk đầu tiên làm thumbnail source, và tạo một sequential playback URL list. Frontend player sẽ chơi từng chunk nối tiếp.
6. Update `chunked_recordings.status = 'done'`, set `output_object_key`
7. Tạo post trên feed với `video_url` trỏ đến manifest hoặc chunk playlist

**Trade-off MVP**: Vì Edge Functions không chạy FFmpeg, playback sẽ là sequential chunk loading (player tải chunk 0, play xong tải chunk 1...). Đây là cách khả thi nhất không cần server FFmpeg. Trong tương lai có thể thêm worker ghép MP4.

### Phase 4: Frontend — `ChunkedRecordingManager`

**File mới**: `src/modules/live/recording/chunkedRecorder.ts`

Lớp chính quản lý toàn bộ flow:

```typescript
class ChunkedRecordingManager {
  // Config
  private chunkDurationMs = 4000;  // 4 seconds
  private maxConcurrentUploads = 2;
  private maxRetries = 3;
  
  // State
  private recordingId: string;
  private seq = 0;
  private uploadQueue: ChunkJob[];
  private isOnline = true;
  
  // Methods
  start(stream: MediaStream): void
  stop(): Promise<void>
  resume(recordingId: string): Promise<void>
  getStatus(): ChunkedRecordingStatus
  destroy(): void
}
```

**Upload Queue logic**:
- Mỗi `ondataavailable` event → tạo `ChunkJob { seq, blob, retries: 0 }`
- Queue processor: lấy job → gọi `r2-signed-chunk-url` → PUT blob → update DB
- Retry với exponential backoff (1s, 2s, 4s)
- `navigator.onLine` listener: pause queue khi offline, resume khi online
- `visibilitychange` listener: khi app quay lại foreground, check queue

**Resume logic**:
- Khi start, lưu `recordingId` vào `localStorage`
- Khi page reload: check localStorage → query DB `last_seq_uploaded` → tiếp tục từ `seq + 1`
- Khi `ChunkedRecordingManager.resume()` được gọi

**File mới**: `src/modules/live/recording/uploadQueue.ts`
- Generic upload queue với concurrency control, retry, pause/resume

### Phase 5: Tích hợp vào `LiveHostPage.tsx`

**Feature flag**: `VITE_RECORDING_CHUNKED=true`

Khi flag bật:
- Thay `createRecorder()` bằng `new ChunkedRecordingManager()`
- Khởi tạo recording row trong DB trước khi start
- UI hiển thị: `Recording • Uploading (x/y chunks) • Finalizing • Done/Failed`
- "Resume upload" button khi có chunks chưa upload
- Khi "Kết thúc Live": stop recorder → flush queue → gọi `recording-finalize`

Khi flag tắt: giữ nguyên flow cũ (single blob upload)

### Phase 6: Playback Component

**File mới**: `src/modules/live/components/ChunkedVideoPlayer.tsx`

MVP player:
- Fetch `manifest.json` từ R2
- Load chunk theo thứ tự vào `MediaSource` API (nếu browser hỗ trợ)
- Fallback: download tất cả chunks, gộp Blob, tạo object URL

---

## Danh sách file cần tạo/sửa

| File | Loại | Mô tả |
|------|------|-------|
| SQL Migration | Mới | Tạo bảng `chunked_recordings` + `chunked_recording_chunks` + RLS |
| `supabase/functions/r2-signed-chunk-url/index.ts` | Mới | Presigned URL per chunk |
| `supabase/functions/recording-finalize/index.ts` | Mới | Build manifest, create post |
| `src/modules/live/recording/chunkedRecorder.ts` | Mới | ChunkedRecordingManager class |
| `src/modules/live/recording/uploadQueue.ts` | Mới | Upload queue với retry/backoff |
| `src/modules/live/components/ChunkedVideoPlayer.tsx` | Mới | Sequential chunk playback |
| `src/modules/live/pages/LiveHostPage.tsx` | Sửa | Tích hợp chunked recorder behind feature flag |
| `src/modules/live/liveService.ts` | Sửa | Thêm helper functions cho chunked recording |

---

## Security

- R2 credentials **chỉ** ở edge functions, không lộ frontend
- Mỗi signed URL expire 60s
- Validate `recording_id` ownership qua JWT
- Rate limit signed URL endpoint
- RLS trên cả 2 bảng mới: chỉ owner mới có quyền CRUD

## Trade-offs & Limitations (MVP)

| Item | MVP | Future |
|------|-----|--------|
| Playback | Sequential chunk loading via MediaSource / blob concat | FFmpeg ghép MP4 trên VPS worker |
| Seek | Hạn chế (chỉ seek trong chunk hiện tại) | Full seek sau khi ghép MP4 |
| Codec | webm/vp8 only | webm + mp4/h264 |
| Max duration | ~2 giờ (phụ thuộc R2 chunk count) | Unlimited |

