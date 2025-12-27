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
      console.error('[stream-video] Missing environment variables:', {
        hasAccountId: !!CLOUDFLARE_ACCOUNT_ID,
        hasApiToken: !!CLOUDFLARE_STREAM_API_TOKEN,
      });
      throw new Error('Missing Cloudflare Stream configuration');
    }

    // Parse request
    const url = new URL(req.url);

    // Parse body early (also used to carry `action` when calling via supabase.functions.invoke)
    const body = await req.json().catch(() => ({}));

    // Action can come from query string (legacy) OR request body (preferred)
    const action = (url.searchParams.get('action') ?? body?.action) as string | null;

    if (!action) {
      throw new Error('Missing action');
    }

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
      case 'get-tus-endpoint': {
        // Return TUS endpoint for resumable uploads
        // The TUS endpoint for Cloudflare Stream
        const tusEndpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;
        
        console.log('[stream-video] Returning TUS endpoint');

        return new Response(JSON.stringify({
          tusEndpoint,
          apiToken: CLOUDFLARE_STREAM_API_TOKEN, // Client needs this for TUS auth
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-upload-url': {
        // Create TUS upload URL for resumable uploads (One-time upload URL)
        const maxDurationSeconds = body.maxDurationSeconds || 900; // 15 minutes max


        console.log('[stream-video] Creating TUS upload URL, maxDuration:', maxDurationSeconds);

        // Use the Direct Creator Upload endpoint which returns a one-time TUS URL
        // IMPORTANT: requireSignedURLs must be base64 encoded as "false" to make videos public
        const uploadMetadata = [
          `maxDurationSeconds ${btoa(maxDurationSeconds.toString())}`,
          `requiresignedurls ${btoa('false')}`,
          `name ${btoa(`upload_${user.id}_${Date.now()}`)}`,
        ].join(',');

        console.log('[stream-video] TUS metadata:', uploadMetadata);

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Length': body.fileSize?.toString() || '0',
              'Upload-Metadata': uploadMetadata,
            },
          }
        );

        console.log('[stream-video] TUS response status:', response.status);
        console.log('[stream-video] TUS response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Cloudflare TUS error:', errorText);
          throw new Error(`Failed to create TUS upload URL: ${response.status} - ${errorText}`);
        }

        // The upload URL is in the Location header for TUS
        const uploadUrl = response.headers.get('Location');
        const streamMediaId = response.headers.get('stream-media-id');

        if (!uploadUrl) {
          // Fallback: try to get from response body
          const responseData = await response.json().catch(() => null);
          console.log('[stream-video] Response body:', responseData);
          
          if (responseData?.result?.uploadURL) {
            return new Response(JSON.stringify({
              uploadUrl: responseData.result.uploadURL,
              uid: responseData.result.uid,
              expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error('No upload URL returned from Cloudflare');
        }

        const result = {
          uploadUrl,
          uid: streamMediaId,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        };

        console.log('[stream-video] TUS Upload URL created:', result);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'direct-upload': {
        // Direct Creator Upload for simpler flow (non-TUS, for smaller files)
        const maxDurationSeconds = body.maxDurationSeconds || 900;


        console.log('[stream-video] Creating direct upload URL, maxDuration:', maxDurationSeconds);

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
          throw new Error(`Failed to create direct upload: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[stream-video] Direct upload created:', data.result?.uid);
        
        return new Response(JSON.stringify({
          uploadUrl: data.result.uploadURL,
          uid: data.result.uid,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check-status': {
        // Check video processing status
        const { uid } = body;


        if (!uid) {
          throw new Error('Missing video UID');
        }

        console.log('[stream-video] Checking status for:', uid);

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
          {
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Check status error:', errorText);
          throw new Error(`Failed to check status: ${response.status}`);
        }

        const data = await response.json();
        const video = data.result;

        console.log('[stream-video] Video status:', video?.status?.state, 'readyToStream:', video?.readyToStream);

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

      case 'update-video-settings': {
        // Update video settings to disable signed URLs and set allowed origins
        const { uid, requireSignedURLs = false, allowedOrigins = ['*'] } = body;

        if (!uid) {
          throw new Error('Missing video UID');
        }

        console.log('[stream-video] Updating video settings for:', uid, { requireSignedURLs, allowedOrigins });

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requireSignedURLs,
              allowedOrigins,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Update settings error:', errorText);
          throw new Error(`Failed to update video settings: ${response.status}`);
        }

        const data = await response.json();
        console.log('[stream-video] Video settings updated:', data.result?.uid);

        return new Response(JSON.stringify({
          success: true,
          uid,
          requireSignedURLs: data.result?.requireSignedURLs,
          allowedOrigins: data.result?.allowedOrigins,
        }), {
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
