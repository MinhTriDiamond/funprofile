import { createClient } from "npm:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Validate environment
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
      console.error('[stream-video] Missing environment variables');
      throw new Error('Missing Cloudflare Stream configuration');
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (!action) {
      throw new Error('Missing action parameter');
    }

    console.log('[stream-video] Action:', action);

    // Authenticate user for all actions
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
      console.error('[stream-video] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('[stream-video] User:', user.id);

    switch (action) {
      // ============================================
      // GET TUS UPLOAD URL - Direct Creator Upload
      // ============================================
      case 'get-tus-upload-url': {
        const { fileSize, fileName, fileType, fileId } = body;
        
        if (!fileSize || fileSize <= 0) {
          throw new Error('Invalid file size');
        }

        // Log with file identifier to track duplicate requests
        console.log('[stream-video] Creating Direct Creator Upload URL:', {
          fileSize,
          fileName,
          fileType,
          fileId: fileId || 'not-provided',
          userId: user.id,
          timestamp: new Date().toISOString(),
        });

        // Build upload metadata with user ID and file ID for tracking
        const metadata = [
          `maxDurationSeconds ${btoa('1800')}`,
          `requiresignedurls ${btoa('false')}`,
          `name ${btoa(fileName || `video_${Date.now()}`)}`,
        ].join(',');

        // Call Cloudflare Stream API with direct_user=true
        // This returns a Direct Upload URL that the client can use directly
        console.log('[stream-video] Calling Cloudflare API...');
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Length': fileSize.toString(),
              'Upload-Metadata': metadata,
            },
          }
        );

        console.log('[stream-video] Cloudflare response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] Cloudflare error:', errorText);
          throw new Error(`Cloudflare API error: ${response.status}`);
        }

        // Get the direct upload URL from Location header
        const uploadUrl = response.headers.get('Location');
        const streamMediaId = response.headers.get('stream-media-id');

        console.log('[stream-video] Got Direct Upload URL:', {
          uploadUrl: uploadUrl?.substring(0, 80),
          uid: streamMediaId,
          fileId: fileId || 'not-provided',
        });

        if (!uploadUrl) {
          throw new Error('Cloudflare did not return upload URL');
        }

        return new Response(JSON.stringify({
          uploadUrl,
          uid: streamMediaId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // DIRECT UPLOAD URL (for smaller files < 200MB)
      // ============================================
      case 'direct-upload': {
        const maxDurationSeconds = body.maxDurationSeconds || 1800;

        console.log('[stream-video] Creating direct upload URL');

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
        console.log('[stream-video] Direct upload created:', data.result?.uid);
        
        return new Response(JSON.stringify({
          uploadUrl: data.result.uploadURL,
          uid: data.result.uid,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // CHECK VIDEO STATUS
      // ============================================
      case 'check-status': {
        const { uid } = body;
        if (!uid) throw new Error('Missing video UID');

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
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // GET PLAYBACK URL
      // ============================================
      case 'get-playback-url': {
        const { uid } = body;
        if (!uid) throw new Error('Missing video UID');

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

      // ============================================
      // DELETE VIDEO
      // ============================================
      case 'delete': {
        const { uid } = body;
        if (!uid) throw new Error('Missing video UID');

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

      // ============================================
      // UPDATE VIDEO SETTINGS
      // ============================================
      case 'update-video-settings': {
        const { uid, requireSignedURLs = false, allowedOrigins = ['*'] } = body;
        if (!uid) throw new Error('Missing video UID');

        console.log('[stream-video] Updating settings for:', uid);

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
          throw new Error(`Failed to update settings: ${response.status}`);
        }

        const data = await response.json();

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
