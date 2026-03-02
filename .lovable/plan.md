

# Ke hoach hop nhat he thong Livestream Recording

## Hien trang

Hien tai co 2 he thong recording song song:

```text
He thong 1 (Edge Functions - DUNG bucket):
  r2-signed-chunk-url --> presigned URL --> upload truc tiep len fun-rich-media
  recording-finalize --> tao manifest.json tai recordings/{id}/
  Tracking: DB tables chunked_recordings + chunked_recording_chunks
  Bucket: fun-rich-media (account 6083e34a) --> media.fun.rich --> OK

He thong 2 (CF Worker - SAI bucket, DANG ACTIVE):
  LiveHostPage --> useLiveRecording --> uploadLiveChunk() --> CF Worker
  CF Worker --> fun-live-chunks (account khac)
  Worker ghep chunks trong RAM (gioi han 128MB)
  URL tra ve: media.fun.rich/videos/live/... --> 404!
```

**Van de**: `CHUNKED_RECORDING_ENABLED = true` trong `LiveHostPage.tsx` (dong 44) nen hien tai dang dung He thong 2 (CF Worker) de upload chunks, nhung Worker luu vao bucket sai --> replay 404.

## Giai phap: Chuyen LiveHostPage sang dung Edge Functions

Thay vi sua CF Worker, ta chuyen hoan toan sang dung Edge Functions (He thong 1) vi:
- Da luu dung bucket `fun-rich-media`
- Manifest-based: khong gioi han thoi luong
- Co DB tracking
- Da co san code (`r2-signed-chunk-url` + `recording-finalize`)

## Chi tiet thay doi

### 1. Tao ham upload chunk qua Edge Function (liveService.ts)

Thay `uploadLiveChunk()` (hien goi CF Worker) bang logic:
- Goi Edge Function `r2-signed-chunk-url` de lay presigned URL
- Upload blob truc tiep len R2 qua presigned URL
- Ghi nhan chunk vao DB table `chunked_recording_chunks`

Thay `finalizeLiveChunks()` (hien goi CF Worker) bang logic:
- Goi Edge Function `recording-finalize` voi `recording_id` va `live_session_id`
- Edge Function tao manifest.json va cap nhat post

### 2. Cap nhat useLiveRecording hook

Thay doi tham so truyen vao hook:
- Them `recordingId` (ID tu bang `chunked_recordings`)
- Upload function moi goi presigned URL thay vi CF Worker

Luong moi:
1. Khi bat dau live: tao row trong `chunked_recordings` (status = 'recording')
2. Moi chunk: goi `r2-signed-chunk-url` --> upload truc tiep --> ghi `chunked_recording_chunks`
3. Ket thuc: goi `recording-finalize` --> tao manifest --> cap nhat post

### 3. Sua bug attachLiveReplayToPost (LiveHostPage.tsx dong 456)

```typescript
// Truoc (bug - khong bao gio chay vi CHUNKED_RECORDING_ENABLED = true):
if (playbackUrl && !CHUNKED_RECORDING_ENABLED) {

// Sau (luon chay khi co playbackUrl):
if (playbackUrl) {
```

### 4. Cap nhat LiveHostPage.tsx - luong chunked

Them buoc tao `chunked_recordings` row khi bat dau live:
- Insert vao `chunked_recordings` voi `user_id`, `status: 'recording'`, `mime_type`
- Truyen `recordingId` vao `useLiveRecording`

Ket thuc live:
- Goi `recording-finalize` Edge Function thay vi `finalizeLiveChunks` (CF Worker)
- `recording-finalize` da tu dong cap nhat post voi manifest URL

### 5. Don dep CF Worker (fun-agora-rtc-token)

- Bo route `/upload/live-chunk` va `/upload/live-finalize` trong `src/index.ts`
- Bo R2 binding `LIVE_CHUNKS` trong `wrangler.toml`
- Chi giu route `POST /` cho Agora token generation

## Danh sach file thay doi

| File | Thay doi |
|---|---|
| `src/modules/live/liveService.ts` | Thay `uploadLiveChunk` va `finalizeLiveChunks` bang logic presigned URL + Edge Function |
| `src/hooks/live/useLiveRecording.ts` | Cap nhat upload function dung presigned URL, them recordingId |
| `src/modules/live/pages/LiveHostPage.tsx` | Tao chunked_recordings row khi start, sua bug dong 456, goi recording-finalize |
| `fun-agora-rtc-token/wrangler.toml` | Bo R2 binding |
| `fun-agora-rtc-token/src/index.ts` | Bo route upload/finalize, chi giu token |

## Luong moi sau khi hop nhat

```text
LiveHostPage
  |-- Bat dau live --> tao live_session + tao chunked_recordings row
  |-- useLiveRecording hook:
  |     |-- Moi 2 giay: tao chunk blob
  |     |-- Goi r2-signed-chunk-url Edge Function --> nhan presigned URL
  |     |-- Upload blob truc tiep len R2 (fun-rich-media)
  |     |-- Ghi row vao chunked_recording_chunks
  |-- Ket thuc live:
  |     |-- Stop recorder
  |     |-- Goi recording-finalize Edge Function
  |     |     |-- Tao manifest.json tai recordings/{id}/
  |     |     |-- Cap nhat post voi manifest URL
  |     |-- attachLiveReplayToPost
  |     |-- finalizeLiveSession
  |-- URL replay: media.fun.rich/recordings/{id}/manifest.json --> OK!
```

## Bao toan du lieu

- Du lieu trong `fun-rich-media/recordings/`: van nguyen, truy cap binh thuong
- Du lieu trong `fun-live-chunks` (neu co): con can kiem tra thu cong va copy sang
- Sau khi deploy code moi, moi buoi live se luu dung bucket, khong con 404

## Rui ro

- **Thap**: Khong thay doi database schema, chi thay doi luong upload
- **Thap**: Edge Functions `r2-signed-chunk-url` va `recording-finalize` da ton tai va hoat dong
- **Can xac nhan**: Secrets `CLOUDFLARE_*` tren Lovable Cloud phai tro ve account `6083e34a` va bucket `fun-rich-media`

