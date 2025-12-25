/**
 * Image Transformation Utility
 * 
 * Generates optimized image URLs with on-the-fly transformations
 * Uses Cloudflare Images for real-time processing
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center';
  quality?: number;
  format?: 'auto' | 'webp' | 'avif';
  blur?: number;
  brightness?: number;
  contrast?: number;
  sharpen?: number;
  rotate?: 0 | 90 | 180 | 270;
  filter?: 'grayscale' | 'blur-light' | 'blur-heavy' | 'bright' | 'dark' | 'high-contrast' | 'sharp';
  preset?: 'avatar' | 'avatar-sm' | 'avatar-lg' | 'cover' | 'thumbnail' | 'post' | 'post-grid' | 'gallery';
}

// Preset configurations for common use cases
export const IMAGE_PRESETS: Record<string, ImageTransformOptions> = {
  'avatar': { width: 128, height: 128, fit: 'cover', gravity: 'auto', format: 'webp', quality: 85 },
  'avatar-sm': { width: 40, height: 40, fit: 'cover', gravity: 'auto', format: 'webp', quality: 80 },
  'avatar-lg': { width: 256, height: 256, fit: 'cover', gravity: 'auto', format: 'webp', quality: 90 },
  'cover': { width: 1200, height: 400, fit: 'cover', gravity: 'auto', format: 'webp', quality: 85 },
  'thumbnail': { width: 300, height: 300, fit: 'cover', gravity: 'auto', format: 'webp', quality: 75 },
  'post': { width: 800, fit: 'scale-down', format: 'webp', quality: 85 },
  'post-grid': { width: 400, height: 400, fit: 'cover', gravity: 'auto', format: 'webp', quality: 80 },
  'gallery': { width: 1200, fit: 'scale-down', format: 'webp', quality: 90 },
};

/**
 * Generate a transformed image URL
 * 
 * @param originalUrl - The original image URL (must be publicly accessible)
 * @param options - Transformation options
 * @returns Transformed image URL
 * 
 * @example
 * // Using preset
 * getTransformedImageUrl('https://example.com/image.jpg', { preset: 'avatar' })
 * 
 * // Custom options
 * getTransformedImageUrl('https://example.com/image.jpg', { width: 300, format: 'webp' })
 * 
 * // With filter
 * getTransformedImageUrl('https://example.com/image.jpg', { preset: 'post', filter: 'bright' })
 */
export function getTransformedImageUrl(
  originalUrl: string | null | undefined,
  options: ImageTransformOptions = {}
): string {
  if (!originalUrl) return '/placeholder.svg';
  
  // Skip transformation for placeholder or data URLs
  if (originalUrl.startsWith('data:') || originalUrl === '/placeholder.svg') {
    return originalUrl;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return originalUrl;

  // Build query params
  const params = new URLSearchParams();
  params.set('url', originalUrl);

  // Apply preset if specified
  if (options.preset) {
    params.set('preset', options.preset);
  }

  // Apply individual options (these override preset values)
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.fit) params.set('fit', options.fit);
  if (options.gravity) params.set('gravity', options.gravity);
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);
  if (options.blur) params.set('blur', options.blur.toString());
  if (options.brightness !== undefined) params.set('brightness', options.brightness.toString());
  if (options.contrast !== undefined) params.set('contrast', options.contrast.toString());
  if (options.sharpen) params.set('sharpen', options.sharpen.toString());
  if (options.rotate) params.set('rotate', options.rotate.toString());
  if (options.filter) params.set('filter', options.filter);

  return `${supabaseUrl}/functions/v1/image-transform?${params.toString()}`;
}

/**
 * Quick helper for avatar images
 */
export function getAvatarUrl(url: string | null | undefined, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const presetMap = { sm: 'avatar-sm', md: 'avatar', lg: 'avatar-lg' } as const;
  return getTransformedImageUrl(url, { preset: presetMap[size] });
}

/**
 * Quick helper for cover photos
 */
export function getCoverUrl(url: string | null | undefined): string {
  return getTransformedImageUrl(url, { preset: 'cover' });
}

/**
 * Quick helper for post media in grid
 */
export function getPostGridUrl(url: string | null | undefined): string {
  return getTransformedImageUrl(url, { preset: 'post-grid' });
}

/**
 * Quick helper for full post images
 */
export function getPostUrl(url: string | null | undefined): string {
  return getTransformedImageUrl(url, { preset: 'post' });
}

/**
 * Quick helper for gallery/lightbox images
 */
export function getGalleryUrl(url: string | null | undefined): string {
  return getTransformedImageUrl(url, { preset: 'gallery' });
}

/**
 * Generate srcset for responsive images
 */
export function getResponsiveSrcSet(
  originalUrl: string | null | undefined,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (!originalUrl) return '';
  
  return widths
    .map(w => `${getTransformedImageUrl(originalUrl, { width: w, format: 'webp' })} ${w}w`)
    .join(', ');
}

/**
 * Check if URL is transformable (R2 or public URL)
 */
export function isTransformableUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Skip data URLs and placeholders
  if (url.startsWith('data:') || url === '/placeholder.svg') return false;
  
  // Allow R2 URLs and any public HTTPS URL
  return url.startsWith('https://');
}
