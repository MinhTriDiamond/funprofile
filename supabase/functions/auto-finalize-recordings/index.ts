/**
 * auto-finalize-recordings Edge Function
 * Runs via pg_cron every 5 minutes to finalize stuck recordings.
 * Concatenates chunks into a single replay.webm, verifies, and batch-deletes old chunks.
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

// ─── R2 Multipart Upload ────────────────────────────────────────────────────

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
  await resp.text();
  return resp.headers.get('ETag') || `"part-${partNumber}"`;
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
  try { const resp = await signedRequest('DELETE', uri, {}, null, qs); await resp.text(); } catch { /* best effort */ }
}

// ─── HEAD + Batch Delete ─────────────────────────────────────────────────────

async function headR2Object(objectKey: string): Promise<number> {
  const r2 = getR2Config();
  const uri = `/${r2.bucketName}/${objectKey}`;
  const resp = await signedRequest('HEAD', uri, {}, null);
  if (!resp.ok) throw new Error(`HEAD failed: ${resp.status}`);
  return parseInt(resp.headers.get('content-length') || '0', 10);
}

async function batchDeleteFromR2(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const r2 = getR2Config();
  let totalDeleted = 0;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const objectsXml = batch.map(k => `<Object><Key>${k}</Key></Object>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${objectsXml}</Delete>`;
    const bodyBytes = new TextEncoder().encode(body);

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

// ─── Fetch chunk with retries ────────────────────────────────────────────────

async function fetchChunkData(url: string, retries = 3): Promise<Uint8Array> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
      return new Uint8Array(await resp.arrayBuffer());
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

// ─── Concat + Upload + Verify + Delete for one recording ─────────────────────

async function finalizeRecording(
  supabaseAdmin: ReturnType<typeof createClient>,
  rec: any,
  chunks: any[],
  session: any,
): Promise<{ action: string; replay_url?: string; error?: string }> {
  const r2 = getR2Config();
  const mimeType = rec.mime_type || 'video/webm';
  const replayKey = `recordings/${rec.id}/replay.webm`;
  const totalDurationMs = chunks.reduce((sum: number, c: any) => sum + (c.duration_ms || 4000), 0);

  // Mark assembling
  await supabaseAdmin.from('chunked_recordings').update({ status: 'assembling' }).eq('id', rec.id);

  const uploadId = await initiateMultipartUpload(replayKey, mimeType);
  const PART_SIZE = 5 * 1024 * 1024;
  const etags: { partNumber: number; etag: string }[] = [];
  let partNumber = 1;
  let buffer = new Uint8Array(0);
  let totalBytesProcessed = 0;

  try {
    for (const chunk of chunks) {
      const chunkData = await fetchChunkData(`${r2.publicUrl}/${chunk.object_key}`);
      totalBytesProcessed += chunkData.length;

      const newBuffer = new Uint8Array(buffer.length + chunkData.length);
      newBuffer.set(buffer);
      newBuffer.set(chunkData, buffer.length);
      buffer = newBuffer;

      while (buffer.length >= PART_SIZE) {
        const partData = buffer.slice(0, PART_SIZE);
        buffer = buffer.slice(PART_SIZE);
        const etag = await uploadPart(replayKey, uploadId, partNumber, partData);
        etags.push({ partNumber, etag });
        partNumber++;
      }
    }

    if (buffer.length > 0) {
      const etag = await uploadPart(replayKey, uploadId, partNumber, buffer);
      etags.push({ partNumber, etag });
    }

    await completeMultipartUpload(replayKey, uploadId, etags);
  } catch (err) {
    await abortMultipartUpload(replayKey, uploadId);
    throw err;
  }

  // Verify
  const actualSize = await headR2Object(replayKey);
  if (Math.abs(actualSize - totalBytesProcessed) > 1024) {
    throw new Error(`Size verification failed: expected ${totalBytesProcessed}, got ${actualSize}`);
  }

  const replayUrl = `${r2.publicUrl}/${replayKey}`;

  // Batch delete old chunks
  const chunkKeys = chunks.map((c: any) => c.object_key).filter(Boolean);
  const deletedCount = await batchDeleteFromR2(chunkKeys);

  // Update recording as done
  await supabaseAdmin.from('chunked_recordings').update({
    status: 'done',
    total_chunks: chunks.length,
    output_object_key: replayKey,
    output_url: replayUrl,
    ended_at: new Date().toISOString(),
  }).eq('id', rec.id);

  // Update live session recording status
  await supabaseAdmin.from('live_sessions')
    .update({ recording_status: 'ready' })
    .eq('id', rec.live_session_id);

  // Update post with single-file replay URL
  if (session?.post_id) {
    await supabaseAdmin.from('posts').update({
      video_url: replayUrl,
      metadata: {
        live_title: session.title,
        live_status: 'ended',
        live_session_id: rec.live_session_id,
        playback_url: replayUrl,
        playback_type: 'single_file',
        chunked_recording_id: rec.id,
        ended_at: session.ended_at,
        auto_finalized: true,
      },
    }).eq('id', session.post_id);
  }

  console.log(`[auto-finalize] ✓ Recording ${rec.id} → replay.webm (${chunks.length} chunks, ${deletedCount} deleted)`);
  return { action: 'finalized', replay_url: replayUrl };
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept service_role key, cron secret, or anon key
  const authHeader = req.headers.get('Authorization') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  const cronSecret = Deno.env.get('CRON_SECRET');
  const isCronAuth = cronSecret && req.headers.get('X-Cron-Secret') === cronSecret;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const isAnonCron = authHeader === `Bearer ${anonKey}`;

  if (!isServiceRole && !isCronAuth && !isAnonCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find stuck recordings: status='recording' but session ended > 5 min ago
    const { data: stuckRecordings, error: queryErr } = await supabaseAdmin
      .from('chunked_recordings')
      .select(`
        id, user_id, live_session_id, mime_type, codec, width, height,
        live_sessions!chunked_recordings_live_session_id_fkey(id, status, ended_at, post_id, title)
      `)
      .eq('status', 'recording')
      .not('live_session_id', 'is', null);

    if (queryErr) {
      console.error('auto-finalize query error:', queryErr);
      return new Response(JSON.stringify({ error: queryErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: Array<{ recording_id: string; action: string; replay_url?: string; error?: string }> = [];

    for (const rec of stuckRecordings || []) {
      const session = (rec as any).live_sessions;
      if (!session || session.status !== 'ended') continue;
      if (Date.now() - new Date(session.ended_at).getTime() < 5 * 60 * 1000) continue;

      try {
        const { data: chunks, error: chunkErr } = await supabaseAdmin
          .from('chunked_recording_chunks')
          .select('*')
          .eq('recording_id', rec.id)
          .eq('status', 'uploaded')
          .order('seq', { ascending: true });

        if (chunkErr || !chunks || chunks.length === 0) {
          await supabaseAdmin.from('chunked_recordings')
            .update({ status: 'failed', error_message: 'Auto-finalize: no uploaded chunks', ended_at: new Date().toISOString() })
            .eq('id', rec.id);
          results.push({ recording_id: rec.id, action: 'marked_failed', error: 'No chunks' });
          continue;
        }

        const result = await finalizeRecording(supabaseAdmin, rec, chunks, session);
        results.push({ recording_id: rec.id, ...result });
      } catch (err: any) {
        console.error(`[auto-finalize] Error processing ${rec.id}:`, err);
        await supabaseAdmin.from('chunked_recordings')
          .update({ status: 'failed', error_message: `Auto-finalize error: ${err.message}` })
          .eq('id', rec.id);
        results.push({ recording_id: rec.id, action: 'error', error: err.message });
      }
    }

    // === Keep-alive ping to live-token to prevent cold starts ===
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      await fetch(`${supabaseUrl}/functions/v1/live-token`, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch { /* non-critical */ }

    // Cleanup old live_messages (sessions ended > 7 days ago)
    let messagesDeleted = 0;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldSessions } = await supabaseAdmin
        .from('live_sessions')
        .select('id')
        .eq('status', 'ended')
        .lt('ended_at', sevenDaysAgo)
        .limit(50);

      if (oldSessions && oldSessions.length > 0) {
        const sessionIds = oldSessions.map((s: any) => s.id);
        const { count } = await supabaseAdmin
          .from('live_messages')
          .delete({ count: 'exact' })
          .in('session_id', sessionIds);
        messagesDeleted = count || 0;
        if (messagesDeleted > 0) {
          console.log(`[auto-finalize] Cleaned ${messagesDeleted} old live_messages from ${sessionIds.length} sessions`);
        }
      }
    } catch (cleanErr: any) {
      console.warn('[auto-finalize] Message cleanup error:', cleanErr.message);
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
      messages_cleaned: messagesDeleted,
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('auto-finalize-recordings error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
