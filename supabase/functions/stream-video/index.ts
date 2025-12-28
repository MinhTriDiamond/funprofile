import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Enhanced CORS headers for TUS protocol support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upload-length, upload-metadata, tus-resumable, upload-offset, upload-defer-length',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, HEAD, OPTIONS, DELETE',
  'Access-Control-Expose-Headers': 'Location, Upload-Offset, Upload-Length, Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size, stream-media-id',
  'Access-Control-Max-Age': '86400',
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('[stream-video] Incoming:', {
      method: req.method,
      path: url.pathname,
      hasAction: !!action,
      hasAuthHeader: !!req.headers.get('Authorization') || !!req.headers.get('authorization'),
      tusResumable: req.headers.get('Tus-Resumable') || req.headers.get('tus-resumable') || undefined,
      uploadLength: req.headers.get('Upload-Length') || req.headers.get('upload-length') || undefined,
    });

    // TUS Protocol: Initial POST request from Uppy
    // This DOES NOT require user authentication - only Cloudflare API token
    // Client → Edge Function → Cloudflare (with CF API token)
    if (req.method === 'POST' && !action) {
      console.log('[stream-video] TUS POST - Creating upload URL (no user auth required)');
      
      // Get TUS headers from client
      const uploadLength = req.headers.get('Upload-Length') || '0';
      const uploadMetadata = req.headers.get('Upload-Metadata') || '';
      const tusResumable = req.headers.get('Tus-Resumable') || '1.0.0';

      console.log('[stream-video] TUS headers:', {
        uploadLength,
        uploadMetadata: uploadMetadata.substring(0, 100),
        tusResumable,
      });

      // Build metadata - add our defaults
      let metadata = uploadMetadata;
      if (!metadata.includes('maxDurationSeconds')) {
        metadata = metadata ? `${metadata},maxDurationSeconds ${btoa('1800')}` : `maxDurationSeconds ${btoa('1800')}`;
      }
      if (!metadata.includes('requiresignedurls')) {
        metadata = `${metadata},requiresignedurls ${btoa('false')}`;
      }

      // Forward to Cloudflare Stream with direct_user=true
      // Use OUR Cloudflare API token (not user token)
      const cfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
            'Tus-Resumable': tusResumable,
            'Upload-Length': uploadLength,
            'Upload-Metadata': metadata,
          },
        }
      );

      console.log('[stream-video] Cloudflare response:', cfResponse.status);

      // Get Location header - this is the direct Cloudflare upload URL
      const location = cfResponse.headers.get('Location');
      const streamMediaId = cfResponse.headers.get('stream-media-id');

      console.log('[stream-video] TUS response:', {
        location: location?.substring(0, 80),
        streamMediaId,
        status: cfResponse.status,
      });

      if (!location) {
        const errorBody = await cfResponse.text();
        console.error('[stream-video] No Location header:', errorBody);
        throw new Error('Cloudflare did not return upload URL');
      }

      // Return 201 Created with Location header
      // The TUS client will use this Location for subsequent PATCH requests
      return new Response(null, {
        status: 201,
        headers: {
          ...corsHeaders,
          'Location': location,
          'stream-media-id': streamMediaId || '',
          'Tus-Resumable': '1.0.0',
        },
      });
    }

    // For all other requests (action-based), require user authentication
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

    // Handle action-based requests (JSON body)
    const body = await req.json().catch(() => ({}));
    const finalAction = action || body?.action;

    if (!finalAction) {
      // If no action and not a TUS POST, invalid request
      throw new Error('Invalid request: expected POST for TUS or action parameter');
    }

    console.log(`[stream-video] Action: ${finalAction}, User: ${user.id}`);

    switch (finalAction) {
      case 'get-upload-url': {
        // Create TUS upload URL for resumable uploads
        const maxDurationSeconds = body.maxDurationSeconds || 1800;
        const fileSize = body.fileSize || 0;

        console.log('[stream-video] Creating TUS upload URL');

        const uploadMetadata = [
          `maxDurationSeconds ${btoa(maxDurationSeconds.toString())}`,
          `requiresignedurls ${btoa('false')}`,
          `name ${btoa(`upload_${user.id}_${Date.now()}`)}`,
        ].join(',');

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              'Tus-Resumable': '1.0.0',
              'Upload-Length': fileSize.toString(),
              'Upload-Metadata': uploadMetadata,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[stream-video] TUS URL error:', errorText);
          throw new Error(`Failed to create upload URL: ${response.status}`);
        }

        const uploadUrl = response.headers.get('Location');
        const streamMediaId = response.headers.get('stream-media-id');

        if (!uploadUrl) {
          throw new Error('No upload URL returned');
        }

        console.log('[stream-video] Created upload URL:', { uploadUrl: uploadUrl.substring(0, 50), uid: streamMediaId });

        return new Response(JSON.stringify({
          uploadUrl,
          uid: streamMediaId,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'direct-upload': {
        // Basic upload for files under 200MB
        const maxDurationSeconds = body.maxDurationSeconds || 900;

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
        throw new Error(`Unknown action: ${finalAction}`);
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
