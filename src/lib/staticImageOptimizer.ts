/**
 * Static Image Optimizer
 * 
 * Optimizes static images in /public/ folder by routing them through
 * Cloudflare Image Resizing. This reduces bandwidth by serving properly
 * sized images instead of oversized source files.
 */

const CF_IMAGE_DOMAIN = 'https://media.fun.rich';

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop';
  format?: 'auto' | 'webp' | 'avif';
}

/**
 * Get optimized URL for static images in /public/ folder
 * Routes through Cloudflare Image Resizing for on-the-fly optimization
 */
export function getOptimizedStaticUrl(
  src: string, 
  options: OptimizeOptions = {}
): string {
  // Only optimize images that start with / (relative paths in public folder)
  if (!src || !src.startsWith('/')) {
    return src;
  }

  const {
    width = 64,
    height = 64,
    quality = 85,
    fit = 'cover',
    format = 'auto'
  } = options;

  // Build Cloudflare options string
  const cfOptions = [
    `width=${width}`,
    `height=${height}`,
    `quality=${quality}`,
    `fit=${fit}`,
    `format=${format}`,
    'gravity=auto'
  ].join(',');

  // For static images, we need to use absolute URL through our domain
  // This routes through Cloudflare which can resize them
  const absoluteUrl = `${window.location.origin}${src}`;
  
  return `${CF_IMAGE_DOMAIN}/cdn-cgi/image/${cfOptions}/${encodeURIComponent(absoluteUrl)}`;
}

/**
 * Pre-defined logo sizes for common use cases
 */
export const LOGO_SIZES = {
  xs: { width: 32, height: 32 },     // 32x32 - sidebar icons
  sm: { width: 36, height: 36 },     // 36x36 - navbar logos
  md: { width: 48, height: 48 },     // 48x48 - medium icons
  lg: { width: 64, height: 64 },     // 64x64 - auth page
  xl: { width: 128, height: 128 },   // 128x128 - sponsored ads
} as const;

/**
 * Get optimized navbar logo URL (36x36)
 */
export function getNavbarLogoUrl(src: string): string {
  return getOptimizedStaticUrl(src, { 
    ...LOGO_SIZES.sm,
    quality: 90 
  });
}

/**
 * Get optimized sidebar icon URL (32x32)
 */
export function getSidebarIconUrl(src: string): string {
  return getOptimizedStaticUrl(src, {
    ...LOGO_SIZES.xs,
    quality: 85
  });
}

/**
 * Get optimized auth logo URL (64x64)
 */
export function getAuthLogoUrl(src: string): string {
  return getOptimizedStaticUrl(src, {
    ...LOGO_SIZES.lg,
    quality: 90
  });
}

/**
 * Get optimized sponsored ad logo URL (128x128)
 */
export function getSponsoredLogoUrl(src: string): string {
  return getOptimizedStaticUrl(src, {
    ...LOGO_SIZES.xl,
    quality: 85
  });
}
