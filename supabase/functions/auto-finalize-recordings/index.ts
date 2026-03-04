/**
 * auto-finalize-recordings Edge Function
 * Runs via pg_cron every 5 minutes to finalize stuck recordings
 * where host closed browser without completing finalization.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uploadJsonToR2(objectKey: string, data: Record<string, unknown>): Promise<string> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!;
  const accessKeyId = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID')!;
  const secretAccessKey = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY')!;
  const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;
  const publicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')!;

  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const body = JSON.stringify(data);
  const bodyHash = toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)));

  const canonicalUri = `/${bucketName}/${objectKey}`;
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-content-sha256:${bodyHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';

  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');
  const canonicalRequestHash = toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
  );

  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Host': host,
      'x-amz-content-sha256': bodyHash,
      'x-amz-date': amzDate,
      'Authorization': authorization,
    },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`R2 upload failed: ${resp.status} ${text}`);
  }

  return `${publicUrl}/${objectKey}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept service_role key via Authorization header OR cron secret
  const authHeader = req.headers.get('Authorization') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  const cronSecret = Deno.env.get('CRON_SECRET');
  const isCronAuth = cronSecret && req.headers.get('X-Cron-Secret') === cronSecret;
  // Also accept anon key from pg_cron (backward compat)
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

    const results: Array<{ recording_id: string; action: string; manifest_url?: string; error?: string }> = [];

    for (const rec of stuckRecordings || []) {
      const session = (rec as any).live_sessions;
      if (!session || session.status !== 'ended') continue;

      // Check if ended > 5 minutes ago
      const endedAt = new Date(session.ended_at).getTime();
      if (Date.now() - endedAt < 5 * 60 * 1000) continue;

      try {
        // Get uploaded chunks
        const { data: chunks, error: chunkErr } = await supabaseAdmin
          .from('chunked_recording_chunks')
          .select('*')
          .eq('recording_id', rec.id)
          .eq('status', 'uploaded')
          .order('seq', { ascending: true });

        if (chunkErr || !chunks || chunks.length === 0) {
          // No chunks → mark as failed
          await supabaseAdmin.from('chunked_recordings')
            .update({ status: 'failed', error_message: 'Auto-finalize: no uploaded chunks', ended_at: new Date().toISOString() })
            .eq('id', rec.id);
          results.push({ recording_id: rec.id, action: 'marked_failed', error: 'No chunks' });
          continue;
        }

        // Mark as assembling
        await supabaseAdmin.from('chunked_recordings')
          .update({ status: 'assembling' })
          .eq('id', rec.id);

        const publicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')!;

        // Build manifest
        const totalDurationMs = chunks.reduce((sum: number, c: any) => sum + (c.duration_ms || 4000), 0);
        const manifest = {
          recording_id: rec.id,
          version: 1,
          codec: rec.codec || 'vp8,opus',
          mime_type: rec.mime_type || 'video/webm',
          width: rec.width,
          height: rec.height,
          total_duration_ms: totalDurationMs,
          chunks: chunks.map((c: any) => ({
            seq: c.seq,
            key: c.object_key,
            url: `${publicUrl}/${c.object_key}`,
            bytes: c.bytes,
            duration_ms: c.duration_ms || 4000,
          })),
          created_at: new Date().toISOString(),
          auto_finalized: true,
        };

        // Upload manifest to R2
        const manifestKey = `recordings/${rec.id}/manifest.json`;
        const manifestUrl = await uploadJsonToR2(manifestKey, manifest);

        // Update recording as done
        await supabaseAdmin.from('chunked_recordings')
          .update({
            status: 'done',
            total_chunks: chunks.length,
            output_object_key: manifestKey,
            output_url: manifestUrl,
            ended_at: new Date().toISOString(),
          })
          .eq('id', rec.id);

        // Update live session recording status
        await supabaseAdmin.from('live_sessions')
          .update({ recording_status: 'ready' })
          .eq('id', rec.live_session_id);

        // Update post with replay URL
        if (session.post_id) {
          await supabaseAdmin.from('posts')
            .update({
              video_url: manifestUrl,
              metadata: {
                live_title: session.title,
                live_status: 'ended',
                live_session_id: rec.live_session_id,
                playback_url: manifestUrl,
                playback_type: 'chunked_manifest',
                chunked_recording_id: rec.id,
                ended_at: session.ended_at,
                auto_finalized: true,
              },
            })
            .eq('id', session.post_id);
        }

        results.push({ recording_id: rec.id, action: 'finalized', manifest_url: manifestUrl });
        console.log(`[auto-finalize] ✓ Recording ${rec.id} finalized with ${chunks.length} chunks`);
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
    } catch {
      // Ping failure is non-critical
    }

    // === Cleanup old live_messages (sessions ended > 7 days ago) ===
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
