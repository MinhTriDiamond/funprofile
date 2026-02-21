

# Tao frontend module Live Stream + Edge Functions + Routes

## Tong quan
Tao toan bo 26 file frontend trong `src/modules/live/`, 1 trang LiveDiscoveryPage, 7 edge functions, cap nhat routes trong App.tsx, va ket noi nut "Live Video" tren Feed.

## Buoc 1: Tao frontend module `src/modules/live/` (26 files)

Tao cac file theo dung noi dung tu file dong goi:

| File | Mo ta |
|------|-------|
| `src/modules/live/types.ts` | LiveSession, LivePrivacy, LiveStatus types |
| `src/modules/live/index.ts` | Re-export tat ca |
| `src/modules/live/liveService.ts` | CRUD live sessions, upload recording, viewer count |
| `src/modules/live/streamService.ts` | Upload stream video va tao record |
| `src/modules/live/useLiveSession.ts` | React Query hooks cho live session |
| `src/modules/live/api/agora.ts` | API wrappers: getRtcToken, startRecording, stopRecording |
| `src/modules/live/hooks/useFollowingLiveStatus.ts` | Theo doi ban be dang live |
| `src/modules/live/hooks/useLiveComments.ts` | Comments realtime |
| `src/modules/live/hooks/useLiveMessages.ts` | Messages realtime |
| `src/modules/live/hooks/useLiveReactions.ts` | Reactions realtime |
| `src/modules/live/hooks/useLiveRtc.ts` | Agora RTC connection (host/audience) |
| `src/modules/live/components/FloatingReactions.tsx` | Emoji reactions bay |
| `src/modules/live/components/LiveChatPanel.tsx` | Chat panel |
| `src/modules/live/components/LiveChatReplay.tsx` | Replay chat |
| `src/modules/live/components/LiveSessionCard.tsx` | Card hien thi session |
| `src/modules/live/components/LiveSharePanel.tsx` | Share panel |
| `src/modules/live/components/StartLiveDialog.tsx` | Dialog bat dau live |
| `src/modules/live/pages/HostLive.tsx` | Re-export LiveHostPage |
| `src/modules/live/pages/AudienceLive.tsx` | Re-export LiveAudiencePage |
| `src/modules/live/pages/LiveHostPage.tsx` | Trang host phat live |
| `src/modules/live/pages/LiveAudiencePage.tsx` | Trang xem live |
| `src/modules/live/pages/LiveStream.tsx` | Trang ghi va dang video |
| `src/modules/live/pages/LiveStudio.tsx` | Re-export LiveHostPage |
| `src/modules/live/pages/LiveViewer.tsx` | Re-export LiveAudiencePage |
| `src/modules/live/recording/clientRecorder.ts` | MediaRecorder wrapper |
| `src/modules/live/README.md` | Tai lieu |

## Buoc 2: Tao trang LiveDiscoveryPage

File `src/pages/LiveDiscoveryPage.tsx` - Hien thi ban be dang live va tat ca sessions dang live.

## Buoc 3: Tao 7 Edge Functions

| Edge Function | Mo ta |
|---------------|-------|
| `supabase/functions/live-token/index.ts` | Token cho live (host/audience/recorder) - dieu chinh fallback dung `AGORA_WORKER_URL` da co |
| `supabase/functions/live-start/index.ts` | Deprecated stub (410) |
| `supabase/functions/live-stop/index.ts` | Deprecated stub (410) |
| `supabase/functions/live-recording-start/index.ts` | Bat dau ghi hinh qua Worker |
| `supabase/functions/live-recording-stop/index.ts` | Dung ghi hinh qua Worker |
| `supabase/functions/live-recording-status/index.ts` | Query trang thai ghi hinh |
| `supabase/functions/live-recording-proxy/index.ts` | Deprecated stub (410) |

Dieu chinh quan trong cho edge functions: Thay doi fallback secret name tu `VITE_AGORA_WORKER_URL` thanh `AGORA_WORKER_URL` (va tuong tu cho API key) vi du an da co san cac secret nay.

## Buoc 4: Cap nhat Routes trong App.tsx

Them lazy imports va routes:

```text
/live                      -> LiveDiscoveryPage
/live/new                  -> LiveHostPage (tao session moi)
/live/stream               -> LiveStream (ghi & dang)
/live/:liveSessionId       -> LiveAudiencePage
/live/:liveSessionId/host  -> LiveHostPage
```

## Buoc 5: Ket noi nut "Live Video" tren Feed

Sua `src/components/feed/FacebookCreatePost.tsx` de nut "Live Video" navigate den `/live/new` thay vi mo file picker.

## Buoc 6: Cap nhat agoraRtc.ts

Sua dong `from('live_sessions' as any)` thanh `from('live_sessions')` vi bang da ton tai sau migration.

## Chi tiet ky thuat

### Secrets
Da co day du: `AGORA_WORKER_URL`, `AGORA_WORKER_API_KEY`, `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `CLOUDFLARE_R2_*`, `FUN_PROFILE_ORIGIN`. Khong can them secret moi.

Edge function `live-token` se duoc dieu chinh fallback chain:
1. `LIVE_AGORA_WORKER_URL` (chua co)
2. `AGORA_WORKER_URL` (da co - se dung)
3. `VITE_AGORA_WORKER_URL` (giu tuong thich)

### CSS Animation
Can them keyframe `animate-float-up` cho FloatingReactions trong tailwind config.

### Tong so files thay doi

| Loai | So luong | Files |
|------|----------|-------|
| New | 26 | src/modules/live/* |
| New | 1 | src/pages/LiveDiscoveryPage.tsx |
| New | 7 | supabase/functions/live-* |
| Edit | 1 | src/App.tsx (them routes) |
| Edit | 1 | src/components/feed/FacebookCreatePost.tsx |
| Edit | 1 | src/lib/agoraRtc.ts (nho) |
| Edit | 1 | tailwind.config.ts (them animation) |
| Total | ~38 | |

Do khoi luong lon (~38 files), se tao song song tat ca files trong 1 lan thuc hien.

