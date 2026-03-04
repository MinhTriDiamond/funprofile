

# KẾ HOẠCH THỰC HIỆN 13 ĐIỂM CẢI THIỆN LIVESTREAM + ĐẢM BẢO UI/UX MƯỢT MÀ

Dựa trên kiểm tra chi tiết toàn bộ codebase livestream (9 files frontend, 6+ Edge Functions, 3 DB tables, ChunkedVideoPlayer 703 dòng), đây là kế hoạch triển khai đầy đủ.

---

## PHASE 1: CRITICAL (Tuần 1)

### 1. Auto-finalize stuck recordings
**Vấn đề:** Host đóng tab → `chunked_recordings.status` kẹt ở `'recording'` vĩnh viễn, chunks đã upload nhưng không có manifest → video replay mất.

**Giải pháp:**
- Tạo Edge Function `auto-finalize-recordings/index.ts` chạy bằng `pg_cron` mỗi 5 phút
- Logic: Tìm `chunked_recordings` có `status = 'recording'` mà `live_sessions.status = 'ended'` và `ended_at < now() - interval '5 minutes'`
- Gọi logic finalize giống `recording-finalize` (build manifest.json, upload R2, cập nhật post)
- Dùng service_role key (không cần user JWT)
- Migration SQL bật `pg_cron` + `pg_net` extensions và tạo cron schedule

### 2. Fix `recording-finalize` deprecated `getClaims()`
**Vấn đề:** Dòng 111 trong `supabase/functions/recording-finalize/index.ts` dùng `getClaims(token)` — API deprecated.

**Sửa:** Thay bằng `supabase.auth.getUser()` pattern đã dùng trong `live-token/index.ts`:
```typescript
// Thay getClaims bằng getUser
const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
if (userErr || !user) { ... }
const userId = user.id;
```

### 3. Fix error messages tiếng Việt có dấu
**File:** `src/modules/live/pages/LiveHostPage.tsx`

Thay tất cả chuỗi không dấu:
- Dòng 64: `'Ban chua cap quyen camera/micro.'` → `'Bạn chưa cấp quyền camera/micro.'`
- Dòng 65: `'Khong tim thay thiet bi camera/micro.'` → `'Không tìm thấy thiết bị camera/micro.'`
- Dòng 66: `'Ket noi qua cham, vui long thu lai.'` → `'Kết nối quá chậm, vui lòng thử lại.'`
- Dòng 67: `'Khong the bat dau phat truc tiep.'` → `'Không thể bắt đầu phát trực tiếp.'`
- Dòng 147: `'Ban can dang nhap de phat truc tiep.'` → `'Bạn cần đăng nhập để phát trực tiếp.'` (trong `liveService.ts`)
- Dòng 219 (cùng file): `'Ban can dang nhap de bat dau live'` → `'Bạn cần đăng nhập để bắt đầu live'`
- Dòng 281-282, 565-568: Các thông báo loading/error khác

### 4. Dọn 4 recordings stuck
**Giải pháp:** Migration SQL cập nhật:
```sql
UPDATE chunked_recordings cr
SET status = CASE WHEN cr.output_url IS NOT NULL THEN 'done' ELSE 'failed' END
WHERE cr.status = 'recording'
  AND EXISTS (SELECT 1 FROM live_sessions ls WHERE ls.id = cr.live_session_id AND ls.status = 'ended');
```
(Đã thực hiện trong message trước, nhưng kiểm tra lại 4 cái còn sót)

---

## PHASE 2: IMPORTANT (Tuần 2)

### 5. Audience replay link khi live kết thúc
**File:** `src/modules/live/pages/LiveAudiencePage.tsx` dòng 206-218

**Hiện tại:** AlertDialog chỉ có nút "OK" → navigate("/")

**Sửa:** Thêm nút "Xem lại" dẫn đến post có video replay:
- Khi `session.status === 'ended'`, query `session.post_id` 
- Nếu post có `video_url`, hiển thị nút "Xem lại" navigate đến `/post/${session.post_id}`
- Nếu không, chỉ hiện "OK"

### 6. Viewer count thống nhất
**Vấn đề:** `LiveAudiencePage` dùng cả `incrementLiveViewerCount` (DB RPC) LẪN `useLivePresence` (Realtime), nhưng hiển thị `viewers.length` (Presence). DB count bị inflate khi `beforeunload` không fire (crash).

**Sửa:**
- Bỏ `incrementLiveViewerCount` / `decrementLiveViewerCount` trong `LiveAudiencePage.tsx` (dòng 67-81)
- Chỉ dùng `useLivePresence` cho viewer count (đã chính xác vì Presence tự cleanup khi disconnect)
- Host side: cập nhật `viewer_count` trong DB từ `viewers.length` (Presence) thay vì từ Agora callback

### 7. Friends-only enforcement trong `live-token`
**File:** `supabase/functions/live-token/index.ts`

**Hiện tại:** Audience lấy token cho bất kỳ live session nào mà không check privacy.

**Sửa:** Thêm logic sau khi lookup session:
```typescript
if (session.privacy === 'friends' && role !== 'host') {
  // Check friendship
  const { data: friendship } = await supabaseAdmin
    .from('friendships')
    .select('id')
    .or(`and(user_id.eq.${userId},friend_id.eq.${session.host_user_id}),and(user_id.eq.${session.host_user_id},friend_id.eq.${userId})`)
    .eq('status', 'accepted')
    .limit(1);
  
  if (!friendship || friendship.length === 0) {
    return new Response(JSON.stringify({ error: 'This live is friends-only' }), { status: 403 });
  }
}
```

### 8. Cleanup `useLiveRecording` unmount
**File:** `src/hooks/live/useLiveRecording.ts` dòng 117-122

**Hiện tại:** Cleanup chỉ stop recorder, KHÔNG flush upload queue hay finalize.

**Sửa:**
```typescript
useEffect(() => {
  return () => {
    if (recorderRef.current && recorderRef.current.getState() === 'recording') {
      recorderRef.current.stop().catch(() => {});
    }
    // Flush remaining chunks (best-effort, non-blocking)
    if (queueRef.current) {
      queueRef.current.flush().catch(() => {});
    }
  };
}, []);
```
Lưu ý: `finalize` không gọi ở đây vì cần user context — auto-finalize (điểm 1) sẽ handle.

---

## PHASE 3: NICE-TO-HAVE (Tuần 3-4)

### 9. Safari/iOS optimization
**Vấn đề:** iOS Safari không hỗ trợ MSE cho WebM → fallback blob, download toàn bộ video trước khi phát.

**Giải pháp ngắn hạn (thực hiện ngay):**
- Trong `ChunkedVideoPlayer`, khi detect iOS/Safari, skip MSE hoàn toàn → dùng blob fallback ngay (tiết kiệm thời gian probe codec)
- Thêm `IS_SAFARI` detection: `const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);`

**Giải pháp dài hạn (đề xuất, không trong scope này):** Edge Function transcode WebM → HLS (fMP4 segments).

### 10. Recording quality settings
**File:** `src/modules/live/pages/PreLivePage.tsx`

- Thêm dropdown/toggle cho host chọn chất lượng: 480p (tiết kiệm data), 720p (mặc định), 1080p (HD)
- Truyền qua `location.state` sang `LiveHostPage`
- Trong `useLiveRtc`, set `videoTrack.setEncoderConfiguration()` theo chọn lựa
- Trong `chunkedRecorder.ts`, adjust `videoBitsPerSecond` tương ứng

### 11. Live thumbnail tự động
**Hiện tại:** Thumbnail chỉ generate từ blob khi end live (legacy path). Chunked path không có thumbnail.

**Sửa:** Trong `LiveHostPage`, mỗi 30s capture frame từ video track:
```typescript
// Capture thumbnail from local video track
const captureFrameAsBlob = async (): Promise<Blob | null> => {
  const track = getLocalTracks().video;
  if (!track) return null;
  const imageData = track.getCurrentFrameData();
  // Convert to canvas → blob
  ...
};
```
Upload thumbnail cuối cùng khi end live, dùng `uploadLiveThumbnail`.

### 12. Consolidate Edge Functions
**Hành động:**
- Merge `agora-token` + `live-token` → giữ `live-token` (có session lookup + authorization), deprecate `agora-token`
- Mark `live-recording-start` + `live-recording-stop` + `live-start` + `live-stop` là deprecated (không xóa để tránh break, nhưng thêm warning log)
- Document trong code: "Legacy — replaced by chunked recording system"

### 13. Monitoring dashboard
- Thêm SQL function `get_livestream_stats()` trả về: total sessions, success rate, stuck count, avg duration, daily breakdown
- Hiển thị trong Admin Dashboard tab mới "Livestream Health"
- Alert khi stuck recordings > 0

---

## ĐẢM BẢO UI/UX MƯỢT MÀ — CHỐNG LAG/ĐƠ/CRASH VIDEO REPLAY

### Các cơ chế đã có (tốt, giữ nguyên):
1. **Lazy mount** trong `FeedVideoPlayer`: `IntersectionObserver` với `rootMargin: 400px` — video chỉ mount khi gần viewport
2. **Video coordinator**: Chỉ 1 video phát tại 1 thời điểm
3. **LRU cache** 80MB desktop / 30MB mobile — tự evict chunk xa nhất
4. **Lazy import** `ChunkedVideoPlayer` qua `React.lazy()`
5. **Off-screen placeholder**: Poster image + play icon thay vì video element

### Cải thiện thêm trong kế hoạch này:

**A. Abort khi scroll ra khỏi viewport:**
Trong `FeedVideoPlayer`, khi `isNearViewport` chuyển từ `true → false`:
- Abort fetch đang chạy trong ChunkedVideoPlayer
- Release MSE SourceBuffer
- Clear chunk cache
→ Giảm memory pressure khi scroll feed dài

**B. iOS Safari fast path:**
Như điểm 9 — skip MSE probe, đi thẳng blob fallback, giảm 200-500ms delay.

**C. Memory guard:**
Thêm check `performance.memory` (Chrome) hoặc chunk cache total:
- Nếu memory > 150MB, giảm `MAX_CACHE_BYTES` xuống 20MB
- Nếu > 200MB, pause prefetch hoàn toàn

**D. Error boundary cho video:**
Wrap `ChunkedVideoPlayer` trong `ErrorBoundary` component:
- Nếu crash → hiện "Video không thể phát, nhấn để thử lại" thay vì white screen
- Log error để debug

---

## TÓM TẮT THỨ TỰ THỰC HIỆN

| # | Task | Ưu tiên | Files ảnh hưởng |
|---|------|---------|-----------------|
| 1 | Auto-finalize Edge Function + pg_cron | Critical | New EF + migration |
| 2 | Fix `getClaims()` → `getUser()` | Critical | `recording-finalize/index.ts`, `recover-orphan-livestreams/index.ts` |
| 3 | Fix tiếng Việt có dấu | Critical | `LiveHostPage.tsx`, `liveService.ts` |
| 4 | Dọn stuck recordings | Critical | Migration SQL |
| 5 | Audience replay link | Important | `LiveAudiencePage.tsx` |
| 6 | Viewer count thống nhất | Important | `LiveAudiencePage.tsx`, `LiveHostPage.tsx` |
| 7 | Friends-only enforcement | Important | `live-token/index.ts` |
| 8 | Cleanup unmount flush | Important | `useLiveRecording.ts` |
| 9 | Safari/iOS fast path | Nice | `ChunkedVideoPlayer.tsx` |
| 10 | Quality settings | Nice | `PreLivePage.tsx`, `useLiveRtc.ts` |
| 11 | Live thumbnail auto | Nice | `LiveHostPage.tsx` |
| 12 | Consolidate Edge Functions | Nice | Multiple EFs |
| 13 | Monitoring dashboard | Nice | New SQL fn + Admin UI |
| A-D | UI/UX smoothness | Important | `FeedVideoPlayer.tsx`, `ChunkedVideoPlayer.tsx` |

**Tổng:** ~15 files cần sửa/tạo mới, 2 migration SQL, 1 Edge Function mới, 1 pg_cron job.

