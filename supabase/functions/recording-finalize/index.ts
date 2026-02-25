/**
 * recording-finalize Edge Function
 * Builds manifest.json from uploaded chunks and creates a feed post
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = claimsData.claims.sub as string;

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

    const publicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')!;

    // Build manifest
    const totalDurationMs = chunks.reduce((sum: number, c: any) => sum + (c.duration_ms || 4000), 0);
    const manifest = {
      recording_id,
      version: 1,
      codec: recording.codec || 'vp8,opus',
      mime_type: recording.mime_type || 'video/webm',
      width: recording.width,
      height: recording.height,
      total_duration_ms: totalDurationMs,
      chunks: chunks.map((c: any) => ({
        seq: c.seq,
        key: c.object_key,
        url: `${publicUrl}/${c.object_key}`,
        bytes: c.bytes,
        duration_ms: c.duration_ms || 4000,
      })),
      created_at: new Date().toISOString(),
    };

    // Upload manifest to R2
    const manifestKey = `recordings/${recording_id}/manifest.json`;
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
      .eq('id', recording_id);

    // Create/update post if live_session_id provided
    if (live_session_id) {
      const { data: liveSession } = await supabaseAdmin
        .from('live_sessions')
        .select('post_id, title')
        .eq('id', live_session_id)
        .maybeSingle();

      if (liveSession?.post_id) {
        // Update existing post with manifest URL for chunked playback
        await supabaseAdmin.from('posts')
          .update({
            video_url: manifestUrl,
            metadata: {
              live_title: liveSession.title,
              live_status: 'ended',
              live_session_id,
              playback_url: manifestUrl,
              playback_type: 'chunked_manifest',
              chunked_recording_id: recording_id,
              ended_at: new Date().toISOString(),
            },
          })
          .eq('id', liveSession.post_id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      manifest_url: manifestUrl,
      total_chunks: chunks.length,
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
