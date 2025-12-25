import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransformOptions {
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center';
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'json';
  blur?: number;
  brightness?: number;
  contrast?: number;
  gamma?: number;
  sharpen?: number;
  rotate?: 0 | 90 | 180 | 270;
  background?: string;
  dpr?: number;
  trim?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * Image Transformation Proxy using Cloudflare Images
 * 
 * URL Params:
 * - url: Original image URL (required)
 * - w/width: Target width
 * - h/height: Target height  
 * - fit: Resize mode (scale-down, contain, cover, crop, pad)
 * - gravity: Crop position (auto, left, right, top, bottom, center)
 * - q/quality: Image quality (1-100)
 * - f/format: Output format (auto, webp, avif)
 * - blur: Blur amount (1-250)
 * - brightness: Brightness (-1 to 1)
 * - contrast: Contrast (-1 to 1)
 * - sharpen: Sharpen amount (0-10)
 * - rotate: Rotation (0, 90, 180, 270)
 * - preset: Predefined transformation (avatar, cover, thumbnail, post)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Get original image URL
    const imageUrl = params.get('url');
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's an R2 URL or external URL
    const r2PublicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    
    if (!accountId) {
      console.error('CLOUDFLARE_ACCOUNT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Cloudflare not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse transformation options
    const preset = params.get('preset');
    let options: TransformOptions = {};

    // Apply preset configurations
    if (preset) {
      switch (preset) {
        case 'avatar':
          options = { width: 128, height: 128, fit: 'cover', gravity: 'auto', format: 'webp', quality: 85 };
          break;
        case 'avatar-sm':
          options = { width: 40, height: 40, fit: 'cover', gravity: 'auto', format: 'webp', quality: 80 };
          break;
        case 'avatar-lg':
          options = { width: 256, height: 256, fit: 'cover', gravity: 'auto', format: 'webp', quality: 90 };
          break;
        case 'cover':
          options = { width: 1200, height: 400, fit: 'cover', gravity: 'auto', format: 'webp', quality: 85 };
          break;
        case 'thumbnail':
          options = { width: 300, height: 300, fit: 'cover', gravity: 'auto', format: 'webp', quality: 75 };
          break;
        case 'post':
          options = { width: 800, fit: 'scale-down', format: 'webp', quality: 85 };
          break;
        case 'post-grid':
          options = { width: 400, height: 400, fit: 'cover', gravity: 'auto', format: 'webp', quality: 80 };
          break;
        case 'gallery':
          options = { width: 1200, fit: 'scale-down', format: 'webp', quality: 90 };
          break;
        default:
          break;
      }
    }

    // Override with explicit params
    const width = params.get('w') || params.get('width');
    const height = params.get('h') || params.get('height');
    const fit = params.get('fit') as TransformOptions['fit'];
    const gravity = params.get('gravity') as TransformOptions['gravity'];
    const quality = params.get('q') || params.get('quality');
    const format = params.get('f') || params.get('format');
    const blur = params.get('blur');
    const brightness = params.get('brightness');
    const contrast = params.get('contrast');
    const sharpen = params.get('sharpen');
    const rotate = params.get('rotate');

    if (width) options.width = parseInt(width);
    if (height) options.height = parseInt(height);
    if (fit) options.fit = fit;
    if (gravity) options.gravity = gravity;
    if (quality) options.quality = parseInt(quality);
    if (format) options.format = format as TransformOptions['format'];
    if (blur) options.blur = Math.min(250, Math.max(1, parseInt(blur)));
    if (brightness) options.brightness = parseFloat(brightness);
    if (contrast) options.contrast = parseFloat(contrast);
    if (sharpen) options.sharpen = parseFloat(sharpen);
    if (rotate) options.rotate = parseInt(rotate) as TransformOptions['rotate'];

    // Apply Fun Filters
    const filter = params.get('filter');
    if (filter) {
      switch (filter) {
        case 'grayscale':
          options.contrast = 0;
          options.brightness = 0;
          break;
        case 'blur-light':
          options.blur = 5;
          break;
        case 'blur-heavy':
          options.blur = 20;
          break;
        case 'bright':
          options.brightness = 0.2;
          break;
        case 'dark':
          options.brightness = -0.2;
          break;
        case 'high-contrast':
          options.contrast = 0.3;
          break;
        case 'sharp':
          options.sharpen = 3;
          break;
        default:
          break;
      }
    }

    // Build Cloudflare Image Resizing URL options
    const cfOptions: string[] = [];
    
    if (options.width) cfOptions.push(`width=${options.width}`);
    if (options.height) cfOptions.push(`height=${options.height}`);
    if (options.fit) cfOptions.push(`fit=${options.fit}`);
    if (options.gravity) cfOptions.push(`gravity=${options.gravity}`);
    if (options.quality) cfOptions.push(`quality=${options.quality}`);
    if (options.format) cfOptions.push(`format=${options.format}`);
    if (options.blur) cfOptions.push(`blur=${options.blur}`);
    if (options.brightness !== undefined) cfOptions.push(`brightness=${options.brightness}`);
    if (options.contrast !== undefined) cfOptions.push(`contrast=${options.contrast}`);
    if (options.sharpen) cfOptions.push(`sharpen=${options.sharpen}`);
    if (options.rotate) cfOptions.push(`rotate=${options.rotate}`);

    // Default to auto format and good quality if not specified
    if (!options.format) cfOptions.push('format=auto');
    if (!options.quality) cfOptions.push('quality=85');

    console.log('Transform options:', cfOptions.join(','));
    console.log('Original URL:', imageUrl);

    // Use Cloudflare Image Resizing via their proxy
    // Format: https://imageresizing.example.com/cdn-cgi/image/{options}/{imageUrl}
    // Or use Cloudflare Images API directly
    
    const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    
    if (cfApiToken) {
      // Use Cloudflare Images Transform API
      const transformUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/transform`;
      
      const response = await fetch(transformUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: imageUrl,
          options: {
            width: options.width,
            height: options.height,
            fit: options.fit || 'scale-down',
            gravity: options.gravity || 'auto',
            quality: options.quality || 85,
            format: options.format || 'webp',
            blur: options.blur,
            brightness: options.brightness,
            contrast: options.contrast,
            sharpen: options.sharpen,
            rotate: options.rotate,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cloudflare Images API error:', errorData);
        
        // Fallback: redirect to original image
        return Response.redirect(imageUrl, 302);
      }

      // Stream the transformed image back
      const contentType = response.headers.get('content-type') || 'image/webp';
      
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'CDN-Cache-Control': 'public, max-age=31536000',
          'Vary': 'Accept',
        },
      });
    } else {
      // No API token - return redirect URL with transformation hints
      // Client should use Cloudflare's cdn-cgi/image directly if on Cloudflare zone
      const transformedUrl = new URL(imageUrl);
      
      // Add transformation params to URL for client-side handling
      const responseData = {
        original: imageUrl,
        options: options,
        message: 'Use Cloudflare zone with Image Resizing enabled for on-the-fly transforms',
        fallbackUrl: imageUrl,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in image-transform:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
