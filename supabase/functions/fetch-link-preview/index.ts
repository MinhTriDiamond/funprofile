import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UNAVATAR_MAP: Record<string, string> = {
  youtube: 'youtube',
  twitter: 'twitter',
  tiktok: 'tiktok',
  telegram: 'telegram',
  instagram: 'instagram',
  github: 'github',
};

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

/** Scrape HTML and extract OG/meta tags */
async function scrapePageMeta(url: string): Promise<{
  title: string | null;
  description: string | null;
  image: string | null;
  video: string | null;
  siteName: string | null;
  favicon: string | null;
}> {
  const result = { title: null as string | null, description: null as string | null, image: null as string | null, video: null as string | null, siteName: null as string | null, favicon: null as string | null };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return result;
    const html = await res.text();

    const extract = (property: string): string | null => {
      // property="..." content="..."
      const m1 = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (m1?.[1]) return m1[1].trim();
      // content="..." property="..."
      const m2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'));
      if (m2?.[1]) return m2[1].trim();
      return null;
    };

    const extractName = (name: string): string | null => {
      const m1 = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (m1?.[1]) return m1[1].trim();
      const m2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'));
      if (m2?.[1]) return m2[1].trim();
      return null;
    };

    result.title = extract('og:title') || extractName('twitter:title') || (() => {
      const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return t?.[1]?.trim() || null;
    })();

    result.description = extract('og:description') || extractName('twitter:description') || extractName('description');
    result.image = extract('og:image') || extractName('twitter:image');
    result.video = extract('og:video') || extract('og:video:url');
    result.siteName = extract('og:site_name');

    // Favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch?.[1]) {
      const fav = faviconMatch[1].trim();
      if (fav.startsWith('http')) {
        result.favicon = fav;
      } else {
        const u = new URL(url);
        result.favicon = `${u.origin}${fav.startsWith('/') ? '' : '/'}${fav}`;
      }
    } else {
      try {
        const u = new URL(url);
        result.favicon = `${u.origin}/favicon.ico`;
      } catch { /* ignore */ }
    }

    // Filter out known bad images
    if (result.image) {
      const BAD = ['stc-zlogin.zdn.vn', 'static.xx.fbcdn.net/rsrc.php', '/og-image', 'default_', '/placeholder', 'favicon', 'funplay-og-image'];
      if (BAD.some(p => result.image!.includes(p))) result.image = null;
    }

    return result;
  } catch (e) {
    console.log('scrapePageMeta error:', e);
    return result;
  }
}

/** Legacy: scrape only og:image */
async function scrapeOgImage(url: string): Promise<string | null> {
  const meta = await scrapePageMeta(url);
  return meta.image;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Proxy endpoint (GET)
    const reqUrl = new URL(req.url);
    const proxyTarget = reqUrl.searchParams.get('proxy');
    if (proxyTarget && req.method === 'GET') {
      const targetUrl = decodeURIComponent(proxyTarget);
      console.log(`Proxying image: ${targetUrl}`);
      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FunProfile/1.0)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return new Response(null, { status: res.status, headers: corsHeaders });
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const blob = await res.arrayBuffer();
      return new Response(blob, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const body = await req.json();
    const { url, platform, mode } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // ===== MODE: PREVIEW (full OG metadata) =====
    if (mode === 'preview') {
      console.log(`Preview mode for: ${normalizedUrl}`);
      const meta = await scrapePageMeta(normalizedUrl);
      return new Response(JSON.stringify({
        title: meta.title,
        description: meta.description,
        image: meta.image,
        video: meta.video,
        siteName: meta.siteName,
        favicon: meta.favicon,
        url: normalizedUrl,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== MODE: AVATAR (legacy, default) =====
    let avatarUrl: string | null = null;

    if (platform === 'facebook') {
      const username = extractUsername(normalizedUrl, 'facebook');
      console.log(`Facebook username: ${username}`);
      if (username) {
        try {
          const metaRes = await fetch(
            `https://graph.facebook.com/${encodeURIComponent(username)}/picture?type=large&redirect=false`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta?.data?.url && !meta?.data?.is_silhouette) {
              avatarUrl = meta.data.url;
            }
          }
        } catch (e) { console.log('Facebook graph API error:', e); }

        if (!avatarUrl) {
          avatarUrl = await scrapeOgImage(normalizedUrl);
        }
        if (!avatarUrl) {
          avatarUrl = `https://graph.facebook.com/${encodeURIComponent(username)}/picture?type=large&redirect=true`;
        }
      }
    } else if (platform && UNAVATAR_MAP[platform]) {
      const username = extractUsername(normalizedUrl, platform);
      if (username) {
        avatarUrl = `https://unavatar.io/${UNAVATAR_MAP[platform]}/${encodeURIComponent(username)}`;
      }
    } else {
      avatarUrl = await scrapeOgImage(normalizedUrl);
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
