
# Fix Live Token Edge Function - Root Cause Analysis

## Problem
The `live-token` edge function returns 500 "Token generation failed" because it calls the Agora Worker incorrectly in two ways:

1. **Wrong endpoint path**: `live-token` calls `${workerUrl}/token` but the Worker expects requests at the root `${workerUrl}` (confirmed by the working `agora-token` function which calls `workerUrl` directly without `/token`)
2. **Wrong parameter names**: `live-token` sends `channel_name` (snake_case) but the Worker expects `channelName` (camelCase), matching what `agora-token` sends
3. **Deprecated auth method**: `live-token` uses `supabase.auth.getClaims()` which is deprecated and may fail; the working `agora-token` uses `supabase.auth.getUser()`

## Evidence

Working `agora-token` function (line 75-86):
```typescript
const tokenResp = await fetch(workerUrl, {   // <-- ROOT path, no /token
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": workerApiKey },
  body: JSON.stringify({
    channelName,    // <-- camelCase
    uid: userId,
    role: "publisher",
  }),
});
```

Broken `live-token` function (line 81-93):
```typescript
const workerResp = await fetch(`${workerUrl}/token`, {  // <-- WRONG: /token
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': workerApiKey },
  body: JSON.stringify({
    channel_name: channel,  // <-- WRONG: snake_case
    uid: role === 'host' ? userId : undefined,
    role: role === 'host' ? 'publisher' : 'subscriber',
    expire_seconds: 86400,  // <-- May not be supported
  }),
})
```

## Fix Plan

### Step 1: Fix `supabase/functions/live-token/index.ts`

Three changes:
1. Replace `supabase.auth.getClaims(token)` with `supabase.auth.getUser()` (matching the working pattern)
2. Change Worker call from `${workerUrl}/token` to `${workerUrl}` (root endpoint)
3. Change parameter names from `channel_name` to `channelName` and `expire_seconds` to match Worker format
4. Add error logging when Worker returns non-ok response (for debugging)

### Step 2: Fix `supabase/functions/live-recording-start/index.ts`

Same fixes:
1. Replace `getClaims` with `getUser()`
2. Change Worker token call from `${workerUrl}/token` to `${workerUrl}`
3. Fix parameter names to camelCase

### Step 3: Fix `supabase/functions/live-recording-stop/index.ts`

1. Replace `getClaims` with `getUser()`

### Step 4: Fix `supabase/functions/live-recording-status/index.ts`

1. Replace `getClaims` with `getUser()`

### Step 5: Deploy and test

Deploy all 4 updated edge functions and test the live flow end-to-end.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/live-token/index.ts` | Fix Worker URL path, parameter names, auth method |
| `supabase/functions/live-recording-start/index.ts` | Fix Worker URL path, parameter names, auth method |
| `supabase/functions/live-recording-stop/index.ts` | Fix auth method |
| `supabase/functions/live-recording-status/index.ts` | Fix auth method |
