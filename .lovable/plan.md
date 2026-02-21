
# Fix Live Video - Multiple Issues Found

## Problems Identified

After thorough investigation, I found **6 issues** preventing Live Video from working:

### Issue 1: CORS Headers Incomplete (All 7 Edge Functions)
All edge functions use minimal CORS headers that are missing required Supabase client headers. This causes the browser to block requests.

**Current:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

**Required:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

**Affected files:** All 7 edge functions in `supabase/functions/live-*/index.ts`

### Issue 2: camelCase/snake_case Mismatch (3 Edge Functions)
The client (`api/agora.ts`) sends `sessionId` (camelCase), but `live-recording-start`, `live-recording-stop`, and `live-recording-status` only destructure `session_id` (snake_case). This was already fixed in `live-token` but not in the other 3 functions.

**Fix:** Add `|| body.sessionId` fallback in each function, same pattern as the `live-token` fix.

### Issue 3: VITE_AGORA_WORKER_URL Not Available in Browser
`liveService.ts` line 7 uses `import.meta.env.VITE_AGORA_WORKER_URL` for the recording upload URL. This env var is not set in the project (the secret name is `AGORA_WORKER_URL` which is only available in Deno edge functions, not in Vite frontend).

This breaks `uploadLiveRecording()` -- when a host ends the live, the video upload will fail because `WORKER_URL` is empty.

**Fix options:**
- Since the LiveHostPage uses browser-based MediaRecorder, the recording blob should be uploaded to Supabase Storage or R2 directly instead of via the Worker.
- Alternative: Upload through an edge function proxy that forwards to the Worker.
- Simplest fix: Upload the recording blob to Supabase Storage bucket directly from the browser.

### Issue 4: `start()` Reference Instability in LiveAudiencePage
In `LiveAudiencePage.tsx` line 36-38, `start` is called inside a `useEffect` with `[liveSessionId, session, start]` deps. The `start` function from `useLiveRtc` is recreated when its dependencies change (like `sessionId`, `role`, `enabled`), which can cause the effect to re-fire. However, `startedRef` inside `useLiveRtc` should prevent duplicate calls, so this is low severity.

### Issue 5: Missing `owner_id` in INSERT
`liveService.ts` inserts into `live_sessions` with `owner_id: userId`, but the SELECT statement after insert doesn't include `owner_id`, and `normalizeLiveSession` maps `host_user_id || owner_id`. The column `owner_id` is NOT NULL in the schema, so the insert should work. This is fine.

### Issue 6: Storage Bucket for Thumbnails
`uploadLiveThumbnail` uploads to a bucket called `live-thumbnails`. This bucket may not exist. If it doesn't, the thumbnail upload silently fails (which is acceptable since it's wrapped in try/catch), but it should be created.

---

## Implementation Plan

### Step 1: Fix CORS in All Edge Functions
Update the `corsHeaders` constant in all 7 edge functions to include the full set of required headers.

Files to edit:
- `supabase/functions/live-token/index.ts`
- `supabase/functions/live-start/index.ts`
- `supabase/functions/live-stop/index.ts`
- `supabase/functions/live-recording-start/index.ts`
- `supabase/functions/live-recording-stop/index.ts`
- `supabase/functions/live-recording-status/index.ts`
- `supabase/functions/live-recording-proxy/index.ts`

### Step 2: Fix camelCase/snake_case in 3 Edge Functions
Add `|| body.sessionId` fallback in:
- `supabase/functions/live-recording-start/index.ts` (line 41)
- `supabase/functions/live-recording-stop/index.ts` (line 41)
- `supabase/functions/live-recording-status/index.ts` (line 30)

### Step 3: Fix Recording Upload in liveService.ts
Replace the `VITE_AGORA_WORKER_URL` worker upload with direct Supabase Storage upload. The recording blob will be uploaded to a `live-recordings` storage bucket instead of proxying through the Cloudflare Worker.

Changes in `src/modules/live/liveService.ts`:
- Remove `WORKER_URL` and `ensureWorkerUrl()` 
- Rewrite `uploadLiveRecording()` to upload directly to Supabase Storage
- The storage path: `live/{sessionId}/recording-{timestamp}.webm`
- Return the public URL after upload

### Step 4: Create Storage Buckets
Create a migration to ensure the `live-recordings` and `live-thumbnails` storage buckets exist.

### Step 5: Deploy and Test
Deploy edge functions and verify the full flow works end-to-end.

---

## Files Changed Summary

| Type | File | Change |
|------|------|--------|
| Edit | 7 edge functions | Fix CORS headers |
| Edit | 3 edge functions | Fix sessionId/session_id |
| Edit | `src/modules/live/liveService.ts` | Fix upload to use Supabase Storage |
| New | SQL migration | Create storage buckets |
