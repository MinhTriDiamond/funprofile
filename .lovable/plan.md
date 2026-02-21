
# Fix build error + Create Edge Functions + Update Routes + Final configs

## 1. Fix build error in `src/modules/live/streamService.ts`

Line 2: Change `import { uploadVideoToR2 } from '@/utils/r2Upload'` to `import { uploadToR2 } from '@/utils/r2Upload'`

Line 8: Change `const result = await uploadVideoToR2(file)` to `const result = await uploadToR2(file, 'videos')`

Line 9: Change `return { publicUrl: result.publicUrl, key: result.key }` to `return { publicUrl: result.url, key: result.key }`

## 2. Create 7 Edge Functions

All edge functions will use the secret fallback chain: `LIVE_AGORA_WORKER_URL` -> `AGORA_WORKER_URL` -> `VITE_AGORA_WORKER_URL` (and same for API key).

| File | Description |
|------|-------------|
| `supabase/functions/live-token/index.ts` | Auth user, lookup live_sessions, call Worker for Agora RTC token |
| `supabase/functions/live-token/deno.json` | Empty imports config |
| `supabase/functions/live-start/index.ts` | Deprecated stub (410) |
| `supabase/functions/live-stop/index.ts` | Deprecated stub (410) |
| `supabase/functions/live-recording-start/index.ts` | Auth host, get recorder token, call Worker /recording/start |
| `supabase/functions/live-recording-stop/index.ts` | Auth host, call Worker /recording/stop |
| `supabase/functions/live-recording-status/index.ts` | Auth user, call get_live_recording_context RPC + Worker query |
| `supabase/functions/live-recording-proxy/index.ts` | Deprecated stub (410) |

Update `supabase/config.toml` to add all 7 new functions with `verify_jwt = false`.

## 3. Update Routes in `src/App.tsx`

Add lazy imports and routes (before the `/:username` catch-all route):

```text
/live                      -> LiveDiscoveryPage
/live/new                  -> LiveHostPage (create new session)
/live/stream               -> LiveStream (record & post)
/live/:liveSessionId       -> LiveAudiencePage
/live/:liveSessionId/host  -> LiveHostPage
```

## 4. Connect "Live Video" button in `FacebookCreatePost.tsx`

Change `handleLiveVideoClick` (line 526-528) from opening file picker to `navigate('/live/new')`.

Remove the unused `liveVideoInputRef` hidden input (lines 614-620).

## 5. Update `src/lib/agoraRtc.ts`

Line 135: Remove `as any` cast from `.from('live_sessions' as any)` since the table now exists in the schema.

## 6. Add animation to `tailwind.config.ts`

Add `float-up` keyframe and animation for FloatingReactions component:

```
"float-up": {
  "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
  "100%": { opacity: "0", transform: "translateY(-120px) scale(1.5)" },
}
```

Animation: `"float-up": "float-up 2s ease-out forwards"`
