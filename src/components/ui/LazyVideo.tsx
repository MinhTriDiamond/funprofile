import { useState, useRef, useEffect, VideoHTMLAttributes, memo, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { isSlowConnection, prefersReducedMotion } from '@/utils/performanceOptimizer';
import { isStreamUrl } from '@/utils/streamUpload';
import { SocialVideoPlayer } from './SocialVideoPlayer';

// Lazy load StreamPlayer to reduce initial bundle size (~154KB savings)
const StreamPlayer = lazy(() => import('./StreamPlayer').then(mod => ({ default: mod.StreamPlayer })));

// Lazy load ChunkedVideoPlayer for manifest.json playback
const ChunkedVideoPlayer = lazy(() => import('@/modules/live/components/ChunkedVideoPlayer').then(mod => ({ default: mod.ChunkedVideoPlayer })));

/** Detect if a URL points to a chunked recording manifest */
function isChunkedManifestUrl(url: string): boolean {
  return url.endsWith('manifest.json') || /\/recordings\/[^/]+\/manifest\.json/.test(url);
}

interface LazyVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  showControls?: boolean;
  hideOnError?: boolean;
}

/**
 * High-performance lazy video component
 * - Lazy loads video only when in viewport
 * - Auto-detects Cloudflare Stream URLs and uses HLS player
 * - Preload="none" to save bandwidth
 * - Respects reduced motion preference
 * - Slow connection handling
 * - Option to hide completely on error
 */
export const LazyVideo = memo(({
  src,
  poster,
  className,
  showControls = true,
  autoPlay = false,
  muted = true,
  loop = false,
  hideOnError = false,
  onError,
  ...props
}: LazyVideoProps) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if this is a chunked manifest or Cloudflare Stream video
  const isManifest = isChunkedManifestUrl(src);
  const isStream = !isManifest && isStreamUrl(src);
  
  // Auto-generate poster from Cloudflare Stream URL
  const generateStreamPoster = (videoUrl: string): string | undefined => {
    // Extract UID from iframe.videodelivery.net/{uid}
    const match = videoUrl.match(/iframe\.videodelivery\.net\/([a-f0-9]+)/i);
    if (match) {
      return `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=1s`;
    }
    return undefined;
  };
  
  // Use provided poster or auto-generate from stream URL
  const effectivePoster = poster || (isStream ? generateStreamPoster(src) : undefined);

  // Detect slow connection or reduced motion
  const slowConnection = isSlowConnection();
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: slowConnection ? '0px' : '100px',
        threshold: 0.1 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [slowConnection]);

  // Timeout fallback: force-clear placeholder after 3s in view
  useEffect(() => {
    if (isInView && showPlaceholder) {
      placeholderTimeoutRef.current = setTimeout(() => {
        setShowPlaceholder(false);
        setIsLoaded(true);
      }, 3000);
    }
    return () => {
      if (placeholderTimeoutRef.current) clearTimeout(placeholderTimeoutRef.current);
    };
  }, [isInView, showPlaceholder]);

  const handleLoadedData = () => {
    setIsLoaded(true);
    setShowPlaceholder(false);
  };

  const handleLoadedMetadata = () => {
    // Backup event - fires before onLoadedData and is more reliable for preload="metadata"
    setIsLoaded(true);
    setShowPlaceholder(false);
  };

  const handleCanPlay = () => {
    if (autoPlay && !reducedMotion && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, ignore
      });
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setHasError(true);
    setShowPlaceholder(false);
    onError?.(e);
  };

  const handleStreamError = () => {
    setHasError(true);
    setShowPlaceholder(false);
  };

  const handleStreamReady = () => {
    setIsLoaded(true);
    setShowPlaceholder(false);
  };

  // Hide completely if error and hideOnError is true
  if (hasError && hideOnError) {
    return null;
  }

  // Show error placeholder instead of hiding (prevents posts from disappearing)
  if (hasError) {
    return (
      <div className={cn('relative overflow-hidden bg-muted flex items-center justify-center text-muted-foreground', className)}>
        <div className="flex flex-col items-center gap-2 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <span className="text-xs">Video không thể tải được</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden bg-muted', className)}
    >
      {/* Placeholder with poster - pointer-events-none so it never blocks video controls */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted pointer-events-none">
          {effectivePoster ? (
            <img
              src={effectivePoster}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                // Hide broken poster
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
        </div>
      )}

      {/* Video element */}
      {isInView && (
        isManifest ? (
          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
            <ChunkedVideoPlayer
              manifestUrl={src}
              className={cn(
                'w-full h-full transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              autoPlay={autoPlay && !reducedMotion}
              controls={showControls}
              onReady={handleStreamReady}
              onError={handleStreamError}
            />
          </Suspense>
        ) : isStream ? (
          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
            <StreamPlayer
              src={src}
              poster={effectivePoster}
              className={cn(
                'w-full h-full transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              autoPlay={autoPlay && !reducedMotion}
              muted={muted}
              loop={loop}
              controls={showControls}
              onError={handleStreamError}
              onReady={handleStreamReady}
            />
          </Suspense>
        ) : (
          <SocialVideoPlayer
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            showControls={showControls}
            className={cn(
              'w-full h-full transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          >
            <video
              ref={videoRef}
              src={src}
              poster={effectivePoster}
              muted={muted}
              loop={loop}
              playsInline
              preload="metadata"
              onLoadedData={handleLoadedData}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={handleCanPlay}
              onError={handleError}
              className="w-full h-full object-cover"
              {...props}
            />
          </SocialVideoPlayer>
        )
      )}
    </div>
  );
});

LazyVideo.displayName = 'LazyVideo';

export default LazyVideo;
