/**
 * Generate a URL-friendly slug from Vietnamese text.
 * Follows the FUN.RICH URL design specification.
 */

const VIETNAMESE_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
};

function removeVietnameseAccents(str: string): string {
  return str
    .split('')
    .map((char) => VIETNAMESE_MAP[char] || VIETNAMESE_MAP[char.toLowerCase()]?.toUpperCase() || char)
    .join('');
}

export function generateSlug(title: string, fallback = 'post'): string {
  if (!title || !title.trim()) return fallback;

  let slug = removeVietnameseAccents(title);
  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9]+/g, '_');
  slug = slug.replace(/^_+|_+$/g, '');

  if (slug.length > 60) {
    slug = slug.substring(0, 60);
    const lastUnderscore = slug.lastIndexOf('_');
    if (lastUnderscore > 20) {
      slug = slug.substring(0, lastUnderscore);
    }
  }

  return slug || `${fallback}_auto`;
}

// ─── Content URL builders ───

interface ContentWithSlug {
  id: string;
  slug?: string | null;
  profiles?: { username?: string } | null;
}

/** Build post URL: /{username}/post/{slug} or /post/{id} */
export function getPostUrl(post: ContentWithSlug): string {
  const username = post.profiles?.username;
  if (username && post.slug) return `/${username}/post/${post.slug}`;
  return `/post/${post.id}`;
}

/** Build video/reel URL: /{username}/video/{slug} or /reels/{id} */
export function getVideoUrl(reel: ContentWithSlug): string {
  const username = reel.profiles?.username;
  if (username && reel.slug) return `/${username}/video/${reel.slug}`;
  return `/reels/${reel.id}`;
}

/** Build live URL: /{username}/live/{slug} or /live/{id} */
export function getLiveUrl(session: ContentWithSlug): string {
  const username = session.profiles?.username;
  if (username && session.slug) return `/${username}/live/${session.slug}`;
  return `/live/${session.id}`;
}

// ─── Absolute URLs (for sharing) ───

const PRODUCTION_DOMAIN = 'https://fun.rich';

export function getAbsolutePostUrl(post: ContentWithSlug): string {
  return `${PRODUCTION_DOMAIN}${getPostUrl(post)}`;
}

export function getAbsoluteVideoUrl(reel: ContentWithSlug): string {
  return `${PRODUCTION_DOMAIN}${getVideoUrl(reel)}`;
}

export function getAbsoluteLiveUrl(session: ContentWithSlug): string {
  return `${PRODUCTION_DOMAIN}${getLiveUrl(session)}`;
}
