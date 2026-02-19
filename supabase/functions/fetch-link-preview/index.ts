import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Platforms supported by unavatar.io for user profile pictures
// NOTE: Facebook removed from unavatar — it returns placeholder, not real profile pic
const UNAVATAR_MAP: Record<string, string> = {
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

/**
 * Scrape og:image or twitter:image from a URL's HTML
 * Returns null if not found or not a valid user avatar
 */
async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extract og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (ogMatch?.[1]) {
      const imgUrl = ogMatch[1].trim();
      // Reject known bad/generic images
      const BAD_PATTERNS = [
        'stc-zlogin.zdn.vn',
        'static.xx.fbcdn.net/rsrc.php',
        '/og-image',
        'default_',
        '/placeholder',
        'favicon',
        'funplay-og-image',
      ];
      if (!BAD_PATTERNS.some(p => imgUrl.includes(p))) {
        return imgUrl;
      }
    }

    // Try twitter:image as fallback
    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

    if (twMatch?.[1]) {
      return twMatch[1].trim();
    }

    return null;
  } catch (e) {
    console.log('scrapeOgImage error:', e);
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

    if (platform === 'facebook') {
      // Facebook: use graph API public picture endpoint
      const username = extractUsername(normalizedUrl, 'facebook');
      console.log(`Facebook username: ${username}`);
      if (username) {
        // graph.facebook.com returns a redirect to the actual profile picture
        avatarUrl = `https://graph.facebook.com/${encodeURIComponent(username)}/picture?type=large&redirect=true`;
        console.log(`Facebook graph URL: ${avatarUrl}`);
      }
    } else if (platform && UNAVATAR_MAP[platform]) {
      // Use unavatar.io for supported platforms (real user profile pictures)
      const username = extractUsername(normalizedUrl, platform);
      console.log(`Platform: ${platform}, Username: ${username}`);

      if (username) {
        avatarUrl = `https://unavatar.io/${UNAVATAR_MAP[platform]}/${encodeURIComponent(username)}`;
        console.log(`Built unavatar URL: ${avatarUrl}`);
      }
    } else {
      // For other platforms (Angel, etc.): scrape og:image from page
      console.log(`Platform ${platform} — scraping og:image from: ${normalizedUrl}`);
      avatarUrl = await scrapeOgImage(normalizedUrl);
      console.log(`Scraped og:image: ${avatarUrl}`);
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
