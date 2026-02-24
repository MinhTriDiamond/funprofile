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

export function generateSlug(title: string): string {
  if (!title || !title.trim()) return 'post';

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

  return slug || 'post_auto';
}

/**
 * Build a post URL using the new slug-based format.
 * Falls back to UUID if slug or username is unavailable.
 */
export function getPostUrl(post: {
  id: string;
  slug?: string | null;
  profiles?: { username?: string } | null;
}): string {
  const username = post.profiles?.username;
  const slug = post.slug;

  if (username && slug) {
    return `/${username}/post/${slug}`;
  }
  // Fallback to UUID
  return `/post/${post.id}`;
}

/**
 * Build absolute post URL for sharing (uses fun.rich domain).
 */
export function getAbsolutePostUrl(post: {
  id: string;
  slug?: string | null;
  profiles?: { username?: string } | null;
}): string {
  const path = getPostUrl(post);
  return `https://fun.rich${path}`;
}
