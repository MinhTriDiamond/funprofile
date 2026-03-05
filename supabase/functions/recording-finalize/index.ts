/**
 * recording-finalize Edge Function
 * Fetches uploaded chunks, concatenates into a single replay.webm,
 * verifies the file, batch-deletes old chunks, and creates a feed post.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── R2 / S3 signing utilities ───────────────────────────────────────────────

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getR2Config() {
  return {
    accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
    accessKeyId: Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY')!,
    bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    publicUrl: Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')!,
    region: 'auto',
    service: 's3',
    get host() { return `${this.accountId}.r2.cloudflarestorage.com`; },
  };
}

async function signedRequest(
  method: string,
  canonicalUri: string,
  headers: Record<string, string>,
  body: Uint8Array | string | null,
  queryString = '',
): Promise<Response> {
  const r2 = getR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const bodyBytes = body instanceof Uint8Array ? body : (body ? new TextEncoder().encode(body) : new Uint8Array(0));
  const bodyHash = toHex(await crypto.subtle.digest('SHA-256', bodyBytes));

  const allHeaders: Record<string, string> = {
    ...headers,
    'host': r2.host,
    'x-amz-content-sha256': bodyHash,
    'x-amz-date': amzDate,
  };

  const sortedHeaderKeys = Object.keys(allHeaders).sort();
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${allHeaders[k]}`).join('\n') + '\n';

  const canonicalRequest = [method, canonicalUri, queryString, canonicalHeaders, signedHeaders, bodyHash].join('\n');
  const canonicalRequestHash = toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)));

  const credentialScope = `${dateStamp}/${r2.region}/${r2.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');
  const signingKey = await getSignatureKey(r2.secretAccessKey, dateStamp, r2.region, r2.service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${r2.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = { ...allHeaders, Authorization: authorization };
  const url = `https://${r2.host}${canonicalUri}${queryString ? '?' + queryString : ''}`;

  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: body ? bodyBytes : undefined,
  });
}

// ─── R2 Multipart Upload (for binary concat) ────────────────────────────────

async function initiateMultipartUpload(objectKey: string, contentType: string): Promise<string> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const resp = await signedRequest('POST', uri, { 'content-type': contentType }, null, 'uploads=');
  if (!resp.ok) throw new Error(`Initiate multipart failed: ${resp.status} ${await resp.text()}`);
  const xml = await resp.text();
  const match = xml.match(/<UploadId>(.+?)<\/UploadId>/);
  if (!match) throw new Error('No UploadId in response');
  return match[1];
}

async function uploadPart(objectKey: string, uploadId: string, partNumber: number, data: Uint8Array): Promise<string> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const qs = `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
  const resp = await signedRequest('PUT', uri, { 'content-type': 'application/octet-stream' }, data, qs);
  if (!resp.ok) throw new Error(`Upload part ${partNumber} failed: ${resp.status}`);
  await resp.text(); // consume body
  const etag = resp.headers.get('ETag') || `"part-${partNumber}"`;
  return etag;
}

async function completeMultipartUpload(objectKey: string, uploadId: string, parts: { partNumber: number; etag: string }[]): Promise<void> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const partsXml = parts.map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join('');
  const body = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;
  const resp = await signedRequest('POST', uri, { 'content-type': 'application/xml' }, body, qs);
  if (!resp.ok) throw new Error(`Complete multipart failed: ${resp.status} ${await resp.text()}`);
  await resp.text();
}

async function abortMultipartUpload(objectKey: string, uploadId: string): Promise<void> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  try {
    const resp = await signedRequest('DELETE', uri, {}, null, qs);
    await resp.text();
  } catch { /* best effort */ }
}

// ─── HEAD request to verify uploaded file ────────────────────────────────────

async function headR2Object(objectKey: string): Promise<number> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const resp = await signedRequest('HEAD', uri, {}, null);
  if (!resp.ok) throw new Error(`HEAD failed: ${resp.status}`);
  return parseInt(resp.headers.get('content-length') || '0', 10);
}

// ─── S3 Batch Delete (up to 1000 objects per request) ────────────────────────

async function batchDeleteFromR2(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const r2 = getR2Config();
  let totalDeleted = 0;

  // Process in batches of 1000
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const objectsXml = batch.map(k => `<Object><Key>${k}</Key></Object>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${objectsXml}</Delete>`;

    const bodyBytes = new TextEncoder().encode(body);
    const bodyHash = toHex(await crypto.subtle.digest('MD5', bodyBytes));

    const uri = `/${r2.bucketName}`;
    const resp = await signedRequest('POST', uri, {
      'content-type': 'application/xml',
      'content-md5': btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('MD5', bodyBytes)))),
    }, body, 'delete=');

    if (!resp.ok) {
      console.error(`Batch delete failed: ${resp.status} ${await resp.text()}`);
    } else {
      await resp.text();
      totalDeleted += batch.length;
    }
  }
  return totalDeleted;
}

// ─── Fetch chunk data from R2 with retries ───────────────────────────────────

async function fetchChunkData(url: string, retries = 3): Promise<Uint8Array> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Fetch ${url} failed: ${resp.status}`);
      return new Uint8Array(await resp.arrayBuffer());
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = user.id;

    const { recording_id, live_session_id } = await req.json();
    if (!recording_id) {
      return new Response(JSON.stringify({ error: 'Missing recording_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify ownership
    const { data: recording, error: recErr } = await supabaseAdmin
      .from('chunked_recordings')
      .select('*')
      .eq('id', recording_id)
      .maybeSingle();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: 'Recording not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (recording.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status to assembling
    await supabaseAdmin.from('chunked_recordings')
      .update({ status: 'assembling' })
      .eq('id', recording_id);

    // Get all uploaded chunks
    const { data: chunks, error: chunkErr } = await supabaseAdmin
      .from('chunked_recording_chunks')
      .select('*')
      .eq('recording_id', recording_id)
      .eq('status', 'uploaded')
      .order('seq', { ascending: true });

    if (chunkErr || !chunks || chunks.length === 0) {
      await supabaseAdmin.from('chunked_recordings')
        .update({ status: 'failed', error_message: 'No uploaded chunks found' })
        .eq('id', recording_id);
      return new Response(JSON.stringify({ error: 'No chunks found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const r2 = getR2Config();
    const mimeType = recording.mime_type || 'video/webm';
    const replayKey = `recordings/${recording_id}/replay.webm`;
    const totalDurationMs = chunks.reduce((sum: number, c: any) => sum + (c.duration_ms || 4000), 0);
    const expectedTotalBytes = chunks.reduce((sum: number, c: any) => sum + (c.bytes || 0), 0);

    // ── Step 1: Fetch chunks and upload as single file via multipart upload ──
    const uploadId = await initiateMultipartUpload(replayKey, mimeType);
    const PART_SIZE = 5 * 1024 * 1024; // 5MB minimum part size for S3
    const etags: { partNumber: number; etag: string }[] = [];
    let partNumber = 1;
    let buffer = new Uint8Array(0);
    let totalBytesProcessed = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunkUrl = `${r2.publicUrl}/${chunks[i].object_key}`;
        const chunkData = await fetchChunkData(chunkUrl);
        totalBytesProcessed += chunkData.length;

        // Append to buffer
        const newBuffer = new Uint8Array(buffer.length + chunkData.length);
        newBuffer.set(buffer);
        newBuffer.set(chunkData, buffer.length);
        buffer = newBuffer;

        // Upload part when buffer >= 5MB or last chunk
        while (buffer.length >= PART_SIZE) {
          const partData = buffer.slice(0, PART_SIZE);
          buffer = buffer.slice(PART_SIZE);
          const etag = await uploadPart(replayKey, uploadId, partNumber, partData);
          etags.push({ partNumber, etag });
          partNumber++;
        }
      }

      // Upload remaining buffer as final part
      if (buffer.length > 0) {
        const etag = await uploadPart(replayKey, uploadId, partNumber, buffer);
        etags.push({ partNumber, etag });
      }

      await completeMultipartUpload(replayKey, uploadId, etags);
    } catch (err) {
      await abortMultipartUpload(replayKey, uploadId);
      await supabaseAdmin.from('chunked_recordings')
        .update({ status: 'failed', error_message: `Concat failed: ${(err as Error).message}` })
        .eq('id', recording_id);
      throw err;
    }

    // ── Step 2: Verify the uploaded file ─────────────────────────────────────
    const actualSize = await headR2Object(replayKey);
    if (expectedTotalBytes > 0 && Math.abs(actualSize - totalBytesProcessed) > 1024) {
      // Size mismatch > 1KB tolerance
      console.error(`Size mismatch: expected ~${totalBytesProcessed}, got ${actualSize}`);
      await supabaseAdmin.from('chunked_recordings')
        .update({ status: 'failed', error_message: `Size verification failed: expected ${totalBytesProcessed}, got ${actualSize}` })
        .eq('id', recording_id);
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const replayUrl = `${r2.publicUrl}/${replayKey}`;

    // ── Step 3: Batch delete old chunks from R2 ──────────────────────────────
    const chunkKeys = chunks.map((c: any) => c.object_key).filter(Boolean);
    const deletedCount = await batchDeleteFromR2(chunkKeys);
    console.log(`[finalize] Batch deleted ${deletedCount} chunks for recording ${recording_id}`);

    // ── Step 4: Update recording as done ─────────────────────────────────────
    await supabaseAdmin.from('chunked_recordings')
      .update({
        status: 'done',
        total_chunks: chunks.length,
        output_object_key: replayKey,
        output_url: replayUrl,
        ended_at: new Date().toISOString(),
      })
      .eq('id', recording_id);

    // ── Step 5: Update post with single-file replay URL ──────────────────────
    if (live_session_id) {
      const { data: liveSession } = await supabaseAdmin
        .from('live_sessions')
        .select('post_id, title')
        .eq('id', live_session_id)
        .maybeSingle();

      if (liveSession?.post_id) {
        await supabaseAdmin.from('posts')
          .update({
            video_url: replayUrl,
            metadata: {
              live_title: liveSession.title,
              live_status: 'ended',
              live_session_id,
              playback_url: replayUrl,
              playback_type: 'single_file',
              chunked_recording_id: recording_id,
              ended_at: new Date().toISOString(),
            },
          })
          .eq('id', liveSession.post_id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      replay_url: replayUrl,
      total_chunks: chunks.length,
      total_bytes: totalBytesProcessed,
      chunks_deleted: deletedCount,
      total_duration_ms: totalDurationMs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('recording-finalize error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
