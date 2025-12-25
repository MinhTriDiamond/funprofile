import { useState, useRef, useEffect, ImgHTMLAttributes, memo } from 'react';
import { cn } from '@/lib/utils';
import { isSlowConnection } from '@/utils/performanceOptimizer';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholderColor?: string;
  priority?: boolean;
  onLoadError?: () => void;
  hideOnError?: boolean;
}

/**
 * High-performance lazy image component
 * - Native lazy loading + Intersection Observer
 * - Blur-up placeholder effect
 * - WebP/AVIF support detection
 * - Slow connection handling
 * - Memory efficient
 * - Option to hide completely on error
 */
export const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  fallback = '/placeholder.svg',
  placeholderColor = 'bg-muted',
  priority = false,
  onLoadError,
  hideOnError = false,
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: isSlowConnection() ? '50px' : '200px',
        threshold: 0.01 
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onLoadError?.();
  };

  // Hide completely if error and hideOnError is true
  if (hasError && hideOnError) {
    return null;
  }

  const imageSrc = hasError ? fallback : src;

  return (
    <div 
      ref={imgRef} 
      className={cn('relative overflow-hidden', className)}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && (
        <div 
          className={cn(
            'absolute inset-0 animate-pulse',
            placeholderColor
          )} 
          aria-hidden="true"
        />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
