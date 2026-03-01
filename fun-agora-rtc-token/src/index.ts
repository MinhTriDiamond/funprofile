import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { handleCors, addCorsHeaders } from './cors';
import { validateInput } from './validate';
import { verifySupabaseToken } from './auth';

interface Env {
  AGORA_APP_ID: string;
  AGORA_APP_CERTIFICATE: string;
  API_KEY: string;
  ALLOWED_ORIGINS: string;
  LIVE_CHUNKS: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  R2_PUBLIC_URL: string; // e.g. https://media.fun.rich
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request, env.ALLOWED_ORIGINS);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    let response: Response;

    try {
      if (path === '/upload/live-chunk' && request.method === 'POST') {
        response = await handleChunkUpload(request, env);
      } else if (path === '/upload/live-finalize' && request.method === 'POST') {
        response = await handleFinalize(request, env);
      } else if (path === '/' && request.method === 'POST') {
        response = await handleTokenGeneration(request, env);
      } else {
        response = json({ error: 'Not found' }, 404);
      }
    } catch (err: any) {
      console.error('Worker error:', err);
      response = json({ error: err.message || 'Internal error' }, 500);
    }

    return addCorsHeaders(response, request, env.ALLOWED_ORIGINS);
  },
};

// ─── Route 1: Agora RTC Token Generation ────────────────────────────
async function handleTokenGeneration(request: Request, env: Env): Promise<Response> {
  // Authenticate via X-API-Key
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey || apiKey !== env.API_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body = (await request.json()) as {
    channelName?: string;
    uid?: string | number;
    role?: string;
  };
  const validation = validateInput(body);
  if (!validation.valid) {
    return json({ error: validation.error }, 400);
  }

  const { channelName, uid, role } = body;
  const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  const expirationInSeconds = 86400;
  const uidNum = typeof uid === 'number' ? uid : 0;
  const userAccount = typeof uid === 'string' ? uid : '';

  let token: string;
  if (userAccount) {
    token = RtcTokenBuilder.buildTokenWithUserAccount(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName!,
      userAccount,
      agoraRole,
      expirationInSeconds,
      expirationInSeconds
    );
  } else {
    token = RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName!,
      uidNum,
      agoraRole,
      expirationInSeconds,
      expirationInSeconds
    );
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  return json({
    token,
    app_id: env.AGORA_APP_ID,
    uid: userAccount || uidNum,
    channel: channelName,
    expires_at: currentTimestamp + expirationInSeconds,
  });
}

// ─── Route 2: Upload Live Chunk ─────────────────────────────────────
async function handleChunkUpload(request: Request, env: Env): Promise<Response> {
  // Auth via Supabase JWT
  const authHeader = request.headers.get('Authorization') || '';
  const auth = await verifySupabaseToken(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  if (!auth) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const streamId = request.headers.get('X-Stream-Id');
  const chunkIndexStr = request.headers.get('X-Chunk-Index');

  if (!streamId || chunkIndexStr === null) {
    return json({ error: 'Missing X-Stream-Id or X-Chunk-Index headers' }, 400);
  }

  const chunkIndex = parseInt(chunkIndexStr, 10);
  if (isNaN(chunkIndex) || chunkIndex < 0) {
    return json({ error: 'Invalid X-Chunk-Index' }, 400);
  }

  // Validate streamId format (UUID-like or alphanumeric)
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(streamId)) {
    return json({ error: 'Invalid streamId format' }, 400);
  }

  const body = await request.arrayBuffer();
  if (!body || body.byteLength === 0) {
    return json({ error: 'Empty body' }, 400);
  }

  // Max 10MB per chunk
  if (body.byteLength > 10 * 1024 * 1024) {
    return json({ error: 'Chunk too large (max 10MB)' }, 413);
  }

  const paddedIndex = String(chunkIndex).padStart(5, '0');
  const key = `live-chunks/${streamId}/chunk-${paddedIndex}.webm`;

  await env.LIVE_CHUNKS.put(key, body, {
    httpMetadata: { contentType: 'video/webm' },
    customMetadata: { userId: auth.userId, uploadedAt: new Date().toISOString() },
  });

  return json({ ok: true, key, bytes: body.byteLength });
}

// ─── Route 3: Finalize Live Recording ───────────────────────────────
async function handleFinalize(request: Request, env: Env): Promise<Response> {
  // Auth via Supabase JWT
  const authHeader = request.headers.get('Authorization') || '';
  const auth = await verifySupabaseToken(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  if (!auth) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body = (await request.json()) as { streamId?: string; totalChunks?: number };
  const { streamId, totalChunks } = body;

  if (!streamId) {
    return json({ error: 'streamId is required' }, 400);
  }
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(streamId)) {
    return json({ error: 'Invalid streamId format' }, 400);
  }

  // List all chunks for this stream
  const prefix = `live-chunks/${streamId}/`;
  const listed = await env.LIVE_CHUNKS.list({ prefix });

  if (!listed.objects || listed.objects.length === 0) {
    return json({ error: 'No chunks found for this stream' }, 404);
  }

  // Sort chunks by key to ensure correct order
  const sortedObjects = listed.objects.sort((a, b) => a.key.localeCompare(b.key));

  console.log(`[finalize] Stream ${streamId}: merging ${sortedObjects.length} chunks`);

  // Read all chunks into memory and concatenate
  const chunkBuffers: ArrayBuffer[] = [];
  let totalBytes = 0;

  for (const obj of sortedObjects) {
    const chunkObj = await env.LIVE_CHUNKS.get(obj.key);
    if (!chunkObj) {
      console.warn(`[finalize] Chunk ${obj.key} not found, skipping`);
      continue;
    }
    const buf = await chunkObj.arrayBuffer();
    chunkBuffers.push(buf);
    totalBytes += buf.byteLength;
  }

  if (chunkBuffers.length === 0) {
    return json({ error: 'All chunks were empty or missing' }, 500);
  }

  // Concatenate all chunks
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of chunkBuffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // Save merged file
  const timestamp = Date.now();
  const outputKey = `videos/live/${streamId}/recording-${timestamp}.webm`;

  await env.LIVE_CHUNKS.put(outputKey, merged.buffer, {
    httpMetadata: { contentType: 'video/webm' },
    customMetadata: {
      userId: auth.userId,
      mergedAt: new Date().toISOString(),
      chunksCount: String(chunkBuffers.length),
    },
  });

  // Delete chunks (cleanup)
  const deletePromises = sortedObjects.map((obj) => env.LIVE_CHUNKS.delete(obj.key));
  await Promise.all(deletePromises);

  // Build public URL
  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${outputKey}`
    : outputKey;

  console.log(`[finalize] Stream ${streamId}: merged ${chunkBuffers.length} chunks → ${outputKey} (${totalBytes} bytes)`);

  return json({
    ok: true,
    url: publicUrl,
    key: outputKey,
    bytes: totalBytes,
    chunks: chunkBuffers.length,
  });
}
