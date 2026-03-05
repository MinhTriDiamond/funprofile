import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&copy;': '©', '&reg;': '®', '&trade;': '™',
};

function decodeHtmlEntities(text: string | null): string | null {
  if (!text) return text;
  let result = text;
  // Named entities
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  // Hex numeric entities: &#xc0; &#x1af;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  // Decimal numeric entities: &#192;
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return result;
}

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
  const result = { title: null as string | null, description: null as string | null, image: null as string | null, video: null as string | null, siteName: null as string | null, favicon: null as string | null, author: null as string | null };
  const isFacebook = /facebook\.com|fb\.watch|fb\.com/i.test(url);
  try {
    const ua = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
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
    result.author = extract('article:author') || extractName('author');

    // Fallback 1: JSON-LD author
    if (!result.author) {
      const ldBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (ldBlocks) {
        for (const block of ldBlocks) {
          const jsonStr = block.replace(/<\/?script[^>]*>/gi, '');
          try {
            const ld = JSON.parse(jsonStr);
            const authorObj = ld.author || ld.creator;
            if (authorObj) {
              result.author = typeof authorObj === 'string' ? authorObj : authorObj.name || null;
              if (result.author) break;
            }
          } catch { /* ignore */ }
        }
      }
    }

    // Fallback 2: Facebook inline ownerName / actorName
    if (!result.author) {
      const ownerMatch = html.match(/"ownerName"\s*:\s*"([^"]+)"/);
      if (ownerMatch?.[1]) result.author = ownerMatch[1];
    }
    if (!result.author) {
      const actorMatch = html.match(/"actorName"\s*:\s*"([^"]+)"/);
      if (actorMatch?.[1]) result.author = actorMatch[1];
    }

    // Fallback 3: profile:first_name + profile:last_name
    if (!result.author) {
      const firstName = extract('profile:first_name');
      const lastName = extract('profile:last_name');
      if (firstName) result.author = [firstName, lastName].filter(Boolean).join(' ');
    }

    // Fallback 4: Facebook-specific patterns (mobile HTML)
    if (!result.author && isFacebook) {
      const fbPatterns = [
        /"user_name"\s*:\s*"([^"]+)"/,
        /"profileName"\s*:\s*"([^"]+)"/,
        /"short_name"\s*:\s*"([^"]+)"/,
        /"ownerName"\s*:\s*"([^"]+)"/,
        /"actorName"\s*:\s*"([^"]+)"/,
      ];
      for (const pattern of fbPatterns) {
        const m = html.match(pattern);
        if (m?.[1] && m[1].length > 1 && m[1].length < 100) {
          result.author = m[1];
          break;
        }
      }
    }

    // Clean up Facebook engagement prefix from title: "24 reactions · 11 comments | Real title"
    if (result.title) {
      result.title = result.title.replace(/^\d+\s+reactions?\s*·\s*\d+\s+comments?\s*\|\s*/i, '');
      // Vietnamese variant
      result.title = result.title.replace(/^\d+\s+cảm xúc\s*·\s*\d+\s+bình luận\s*\|\s*/i, '');
    }

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

    // Filter out Facebook login wall responses
    const BAD_TITLES = ['log in or sign up', 'đăng nhập hoặc đăng ký', 'facebook – log in or sign up'];
    if (result.title && BAD_TITLES.some(t => result.title!.toLowerCase().includes(t))) {
      result.title = null;
      result.description = null;
      result.image = null;
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

      let host = '';
      try { host = new URL(targetUrl).hostname; } catch { /* ignore */ }
      const isFbDomain = host.includes('fbcdn.net') || host.includes('fbsbx.com') || host.includes('facebook.com') || host.includes('fb.com');

      const ua = isFbDomain
        ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        : 'Mozilla/5.0 (compatible; FunProfile/1.0)';

      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': ua },
        redirect: isFbDomain ? 'manual' : 'follow',
        signal: AbortSignal.timeout(8000),
      });

      // For Facebook: if redirected (3xx) or got HTML instead of image, return 404
      if (isFbDomain && (res.status >= 300 && res.status < 400)) {
        console.log(`Facebook redirect detected for: ${targetUrl}`);
        return new Response(null, { status: 404, headers: corsHeaders });
      }

      if (!res.ok) return new Response(null, { status: res.status, headers: corsHeaders });

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      // If we got HTML back instead of an image, it's a login wall
      if (contentType.includes('text/html')) {
        console.log(`Got HTML instead of image for: ${targetUrl}`);
        return new Response(null, { status: 404, headers: corsHeaders });
      }

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
        title: decodeHtmlEntities(meta.title),
        description: decodeHtmlEntities(meta.description),
        image: decodeHtmlEntities(meta.image),
        video: decodeHtmlEntities(meta.video),
        siteName: decodeHtmlEntities(meta.siteName),
        favicon: decodeHtmlEntities(meta.favicon),
        author: decodeHtmlEntities(meta.author),
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
