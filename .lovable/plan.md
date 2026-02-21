
# Tich hop tinh nang Live Stream tu file dong goi

## Tong quan

File dong goi chua day du code cho tinh nang Live Stream bao gom: frontend module (`src/modules/live/`), edge functions, database migrations, va Cloudflare Worker recording. Du an hien tai chua co bat ky file nao trong `src/modules/live/`, chua co bang `live_sessions`, va chua co route `/live`.

## Phan tich hien trang

**Da co san:**
- Agora SDK (agora-rtc-sdk-ng) da cai dat
- `src/lib/agoraRtc.ts` da co ham `getLiveToken()` va `createAgoraRtcClient()`
- Secrets: AGORA_WORKER_URL, AGORA_WORKER_API_KEY, AGORA_APP_ID, AGORA_APP_CERTIFICATE, CLOUDFLARE_R2_*, FUN_PROFILE_ORIGIN
- Edge function `agora-token` da co
- Edge function `stream-video`, `cleanup-stream-videos` da co
- Bang `posts` da co cot `post_type`
- Ham `update_updated_at_column()` da ton tai

**Chua co - can tao moi:**
- Toan bo module `src/modules/live/` (26+ file)
- Bang `live_sessions`, `live_recordings`, `live_messages`, `live_reactions`, `live_comments`, `streams`
- Edge functions: `live-token`, `live-start`, `live-stop`, `live-recording-start`, `live-recording-stop`, `live-recording-status`, `live-recording-proxy`
- Routes trong App.tsx
- Trang `LiveDiscoveryPage.tsx`
- Cac ham RPC: `increment_live_viewer_count`, `decrement_live_viewer_count`, `set_live_recording_state`, `upsert_live_recording_row`, `attach_live_replay_to_post`

## Ke hoach thuc hien

### Buoc 1: Database Migration

Tao migration SQL ket hop tat ca 7 file migration lam 1, bao gom:

- Bang `live_sessions` voi day du cot (host_user_id, owner_id, channel_name, agora_channel, recording_uid, recording_status, resource_id, sid, title, privacy, status, viewer_count, post_id, va cac cot recording)
- Bang `live_recordings` cho lifecycle ghi hinh
- Bang `live_messages` cho chat trong live
- Bang `live_reactions` cho reaction emoji
- Bang `live_comments` cho binh luan
- Bang `streams` cho video ghi va dang
- Them cot `metadata` (jsonb) vao bang `posts` neu chua co
- RLS policies cho tat ca cac bang
- Cac ham RPC: `increment_live_viewer_count`, `decrement_live_viewer_count`, `set_live_recording_state`, `upsert_live_recording_row`, `attach_live_replay_to_post`
- Enable realtime cho `live_sessions`, `live_messages`, `live_reactions`, `live_comments`

### Buoc 2: Secrets kiem tra

Can kiem tra va them neu thieu:
- `LIVE_AGORA_WORKER_URL` - co the dung chung AGORA_WORKER_URL hien co
- `LIVE_AGORA_WORKER_API_KEY` - co the dung chung AGORA_WORKER_API_KEY hien co

Edge function `live-token` se fallback tim `LIVE_AGORA_WORKER_URL` hoac `VITE_AGORA_WORKER_URL` (tuong thich nguoc). Vi da co `AGORA_WORKER_URL`, ta se cap nhat edge function de su dung ten secret da co.

### Buoc 3: Tao frontend module `src/modules/live/`

Tao 26 file tu file dong goi:

```text
src/modules/live/
  types.ts                     - LiveSession, LivePrivacy, LiveStatus types
  index.ts                     - Re-export tat ca
  liveService.ts               - CRUD live sessions, upload recording, viewer count
  streamService.ts             - Upload stream video va tao record
  useLiveSession.ts            - React Query hooks cho live session
  api/agora.ts                 - API wrappers: getRtcToken, startRecording, stopRecording
  hooks/useFollowingLiveStatus.ts - Theo doi ban be dang live
  hooks/useLiveComments.ts     - Comments realtime
  hooks/useLiveMessages.ts     - Messages realtime  
  hooks/useLiveReactions.ts    - Reactions realtime
  hooks/useLiveRtc.ts          - Agora RTC connection (host/audience)
  components/FloatingReactions.tsx - Emoji reactions bay
  components/LiveChatPanel.tsx     - Chat panel
  components/LiveChatReplay.tsx    - Replay chat
  components/LiveSessionCard.tsx   - Card hien thi session
  components/LiveSharePanel.tsx    - Share panel
  components/StartLiveDialog.tsx   - Dialog bat dau live
  pages/HostLive.tsx           - Re-export
  pages/AudienceLive.tsx       - Re-export
  pages/LiveHostPage.tsx       - Trang host phat live
  pages/LiveAudiencePage.tsx   - Trang xem live
  pages/LiveStream.tsx         - Trang ghi & dang video
  pages/LiveStudio.tsx         - Re-export
  pages/LiveViewer.tsx         - Re-export
  recording/clientRecorder.ts  - MediaRecorder wrapper
  README.md                    - Tai lieu
```

### Buoc 4: Tao trang LiveDiscoveryPage

`src/pages/LiveDiscoveryPage.tsx` - Trang kham pha live, hien thi ban be dang live va tat ca sessions dang live.

### Buoc 5: Tao Edge Functions

- `supabase/functions/live-token/index.ts` - Token cho live (host/audience/recorder)
- `supabase/functions/live-start/index.ts` - Deprecated stub (410)
- `supabase/functions/live-stop/index.ts` - Deprecated stub (410)
- `supabase/functions/live-recording-start/index.ts` - Bat dau ghi hinh qua Worker
- `supabase/functions/live-recording-stop/index.ts` - Dung ghi hinh qua Worker
- `supabase/functions/live-recording-status/index.ts` - Query trang thai ghi hinh
- `supabase/functions/live-recording-proxy/index.ts` - Proxy recording requests

Cap nhat `supabase/config.toml` them verify_jwt cho cac function moi.

### Buoc 6: Cap nhat Routes trong App.tsx

Them cac route:

```text
/live          -> LiveDiscoveryPage (trang kham pha)
/live/new      -> LiveStream (ghi & dang video) hoac StartLiveDialog
/live/:liveSessionId       -> LiveAudiencePage (xem live)
/live/:liveSessionId/host  -> LiveHostPage (host phat live)
/live/stream   -> Redirect /live/new
/live/studio/:liveSessionId -> Redirect /live/:liveSessionId/host
```

### Buoc 7: Ket noi nut "Live Video" tren Feed

Hien tai nut "Live Video" trong `FacebookCreatePost.tsx` chi mo file picker video. Se thay doi de navigate den `/live/new` (trang ghi & dang hoac bat dau live truc tiep).

### Buoc 8: Cap nhat agoraRtc.ts

File `src/lib/agoraRtc.ts` hien tai da co `getLiveToken` nhung cast `live_sessions` bang `as any`. Se giu nguyen vi bang chua co trong types.ts (se tu dong cap nhat sau migration).

## Luu y quan trong

- **Worker phia Cloudflare** (thu muc `worker/` trong file dong goi): Day la Cloudflare Worker rieng cho recording, can deploy rieng ngoai Lovable. Phan nay khong the tao tu dong trong Lovable, nhung cac Edge Functions se proxy den Worker nay.
- **Secret LIVE_AGORA_WORKER_URL**: Edge function `live-token` su dung ten `LIVE_AGORA_WORKER_URL` hoac fallback `VITE_AGORA_WORKER_URL`. Ca hai deu chua co - se dieu chinh edge function su dung `AGORA_WORKER_URL` da co san.
- Khoi luong thay doi lon (~40 files), se chia lam nhieu buoc thuc hien.

## Files thay doi

| Loai | File | Mo ta |
|------|------|-------|
| Migration | SQL | Tao 6 bang + RLS + RPC functions + realtime |
| New | src/modules/live/* (26 files) | Toan bo module Live |
| New | src/pages/LiveDiscoveryPage.tsx | Trang kham pha live |
| New | 7 edge functions | live-token, live-start, live-stop, live-recording-* |
| Edit | src/App.tsx | Them routes /live/* |
| Edit | src/components/feed/FacebookCreatePost.tsx | Doi nut Live Video navigate den /live/new |
| Edit | src/lib/agoraRtc.ts | Nho, giu tuong thich |
