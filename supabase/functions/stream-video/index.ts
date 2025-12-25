import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
      throw new Error('Missing Cloudflare Stream configuration');
    }

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[stream-video] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case 'get-upload-url': {
        // Create TUS upload URL for resumable uploads
        const body = await req.json().catch(() => ({}));
        const maxDurationSeconds = body.maxDurationSeconds || 300; // 5 minutes max

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Length': '0', // Will be set by client
              'Upload-Metadata': `maxDurationSeconds ${btoa(maxDurationSeconds.toString())}, requiresignedurls ${btoa('false')}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Cloudflare error:', errorText);
          throw new Error(`Failed to create upload URL: ${response.status}`);
        }

        // Get the upload URL from the response headers
        const uploadUrl = response.headers.get('Location') || response.headers.get('stream-media-id');
        const streamMediaId = response.headers.get('stream-media-id');

        // Also try to get from response body
        const responseData = await response.json().catch(() => null);
        
        const result = {
          uploadUrl: uploadUrl || responseData?.result?.uploadURL,
          uid: streamMediaId || responseData?.result?.uid,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        };

        console.log('[stream-video] Upload URL created:', result.uid);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'direct-upload': {
        // Alternative: Direct Creator Upload for simpler flow
        const body = await req.json().catch(() => ({}));
        const maxDurationSeconds = body.maxDurationSeconds || 300;

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              maxDurationSeconds,
              requireSignedURLs: false,
              allowedOrigins: ['*'],
              meta: {
                userId: user.id,
                uploadedAt: new Date().toISOString(),
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Direct upload error:', errorText);
          throw new Error(`Failed to create direct upload: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(JSON.stringify({
          uploadUrl: data.result.uploadURL,
          uid: data.result.uid,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check-status': {
        // Check video processing status
        const body = await req.json();
        const { uid } = body;

        if (!uid) {
          throw new Error('Missing video UID');
        }

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
          {
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }

        const data = await response.json();
        const video = data.result;

        return new Response(JSON.stringify({
          uid: video.uid,
          status: video.status,
          readyToStream: video.readyToStream,
          duration: video.duration,
          thumbnail: video.thumbnail,
          playback: video.playback,
          preview: video.preview,
          meta: video.meta,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-playback-url': {
        // Get playback URLs for a video
        const body = await req.json();
        const { uid } = body;

        if (!uid) {
          throw new Error('Missing video UID');
        }

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
          {
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get playback URL: ${response.status}`);
        }

        const data = await response.json();
        const video = data.result;

        return new Response(JSON.stringify({
          uid: video.uid,
          playback: {
            hls: video.playback?.hls,
            dash: video.playback?.dash,
          },
          thumbnail: video.thumbnail,
          preview: video.preview,
          duration: video.duration,
          readyToStream: video.readyToStream,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        // Delete a video
        const body = await req.json();
        const { uid } = body;

        if (!uid) {
          throw new Error('Missing video UID');
        }

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            },
          }
        );

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to delete video: ${response.status}`);
        }

        console.log('[stream-video] Video deleted:', uid);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[stream-video] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
