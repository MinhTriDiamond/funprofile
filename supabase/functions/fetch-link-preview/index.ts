import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Platforms supported by unavatar.io for user profile pictures
const UNAVATAR_MAP: Record<string, string> = {
  facebook: 'facebook',
  youtube: 'youtube',
  twitter: 'twitter',
  tiktok: 'tiktok',
  telegram: 'telegram',
  instagram: 'instagram',
  github: 'github',
};

/**
 * Extract username/handle from social media URL
 */
function extractUsername(url: string, platform: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathname = u.pathname.replace(/\/$/, '');

    switch (platform) {
      case 'facebook': {
        const id = u.searchParams.get('id');
        if (id) return id;
        const seg = pathname.split('/').filter(Boolean)[0];
        // Skip generic facebook pages
        if (!seg || ['pages', 'groups', 'events', 'photo'].includes(seg)) return null;
        return seg;
      }
      case 'youtube': {
        const parts = pathname.split('/').filter(Boolean);
        if (parts[0]?.startsWith('@')) return parts[0].slice(1);
        if (parts[0] === 'c' || parts[0] === 'user') return parts[1] || null;
        if (parts[0] === 'channel') return parts[1] || null;
        return parts[0] || null;
      }
      case 'twitter': {
        const seg = pathname.split('/').filter(Boolean)[0];
        if (!seg || ['i', 'home', 'explore', 'notifications'].includes(seg)) return null;
        return seg;
      }
      case 'tiktok': {
        const seg = pathname.split('/').filter(Boolean)[0];
        return seg?.startsWith('@') ? seg.slice(1) : seg || null;
      }
      case 'telegram': {
        const seg = pathname.split('/').filter(Boolean)[0];
        return seg || null;
      }
      case 'linkedin': {
        const parts = pathname.split('/').filter(Boolean);
        if (parts[0] === 'in' || parts[0] === 'company') return parts[1] || null;
        return null;
      }
      case 'instagram': {
        const seg = pathname.split('/').filter(Boolean)[0];
        if (!seg || ['explore', 'accounts', 'direct'].includes(seg)) return null;
        return seg;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, platform } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    let avatarUrl: string | null = null;

    // Only use unavatar.io for supported social platforms (real user avatars)
    // Platforms like Zalo, Angel, Fun Play don't have publicly accessible user avatars via unavatar
    if (platform && UNAVATAR_MAP[platform]) {
      const username = extractUsername(normalizedUrl, platform);
      console.log(`Platform: ${platform}, Username: ${username}`);

      if (username) {
        avatarUrl = `https://unavatar.io/${UNAVATAR_MAP[platform]}/${encodeURIComponent(username)}`;
        console.log(`Built unavatar URL: ${avatarUrl}`);
      }
    } else {
      // For non-supported platforms (Zalo, Angel, Fun Play, etc.):
      // Return null — the frontend will show the platform favicon/logo instead
      console.log(`Platform ${platform} not in unavatar map — returning null`);
    }

    return new Response(JSON.stringify({ avatarUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-link-preview error:', error);
    return new Response(JSON.stringify({ avatarUrl: null, error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
