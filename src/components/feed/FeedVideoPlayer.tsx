import { memo, useEffect, useId, useCallback, useState, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { FacebookVideoPlayer } from '@/components/ui/FacebookVideoPlayer';
import { videoPlaybackCoordinator } from './videoPlaybackCoordinator';
import { Radio, Download } from 'lucide-react';
import { downloadChunkedVideo } from '@/utils/chunkedVideoDownload';

const ChunkedVideoPlayer = lazy(() =>
  import('@/modules/live/components/ChunkedVideoPlayer').then(mod => ({ default: mod.ChunkedVideoPlayer }))
);

function isChunkedManifestUrl(url: string): boolean {
  return url.endsWith('manifest.json') || /\/recordings\/[^/]+\/manifest\.json/.test(url);
}

export interface FeedVideoPlayerProps {
  src: string;
  poster?: string;
  displayMode?: 'square' | 'rectangle';
  aspectRatio?: { width: number; height: number };
  fitStrategy?: 'smart' | 'cover' | 'contain';
  isLiveReplay?: boolean;
  itemId?: string;
  feedId?: string;
  className?: string;
  compact?: boolean;
  onError?: () => void;
}

export const FeedVideoPlayer = memo(({
  src,
  poster,
  displayMode = 'square',
  aspectRatio,
  fitStrategy = 'smart',
  isLiveReplay = false,
  itemId,
  feedId,
  className,
  compact = false,
  onError,
}: FeedVideoPlayerProps) => {
  const autoId = useId();
  const coordId = itemId || feedId || autoId;

  // Detect portrait from props, fallback to video metadata
  const [isPortrait, setIsPortrait] = useState<boolean | null>(
    aspectRatio ? aspectRatio.height > aspectRatio.width : null
  );

  // Update portrait state when aspectRatio prop changes
  useEffect(() => {
    if (aspectRatio) {
      setIsPortrait(aspectRatio.height > aspectRatio.width);
    }
  }, [aspectRatio?.width, aspectRatio?.height]);

  // Callback-based metadata detection from FacebookVideoPlayer
  const handleVideoMetadata = useCallback((meta: { width: number; height: number }) => {
    console.log('[FeedVideoPlayer] onVideoMetadata fired:', meta, 'isPortrait currently:', isPortrait);
    if (isPortrait !== null) return;
    setIsPortrait(meta.height > meta.width);
  }, [isPortrait]);

  // Register with coordinator
  useEffect(() => {
    const el = document.querySelector(`[data-feed-video-id="${coordId}"] video`) as HTMLVideoElement | null;
    const pauseFn = () => { el?.pause(); };
    videoPlaybackCoordinator.register(coordId, pauseFn);
    return () => videoPlaybackCoordinator.unregister(coordId);
  }, [coordId, src]);

  const handlePlayStart = useCallback(() => {
    videoPlaybackCoordinator.requestPlay(coordId);
  }, [coordId]);

  const isChunked = isChunkedManifestUrl(src);
  const isSquare = displayMode === 'square';

  // Resolve object fit based on strategy and orientation
  let resolvedObjectFit: 'cover' | 'contain';
  if (!isSquare) {
    resolvedObjectFit = 'contain';
  } else if (fitStrategy === 'cover') {
    resolvedObjectFit = 'cover';
  } else if (fitStrategy === 'contain') {
    resolvedObjectFit = 'contain';
  } else {
    // smart: portrait/unknown => contain (safe default), landscape => cover
    resolvedObjectFit = isPortrait === false ? 'cover' : 'contain';
  }

  const showBackdrop = resolvedObjectFit === 'contain' && isPortrait === true;

  // For portrait in rectangle mode: full-width wrapper with centered video
  const isPortraitRectangle = !isSquare && isPortrait === true;

  const wrapperClass = cn(
    'relative overflow-hidden',
    isSquare ? 'aspect-square' : '',
    isPortraitRectangle ? 'bg-black flex items-center justify-center' : '',
    className
  );

  const arNum = aspectRatio ? aspectRatio.width / aspectRatio.height : undefined;
  const wrapperStyle = isPortraitRectangle
    ? { maxHeight: '70vh', aspectRatio: '16/9' }
    : !isSquare && arNum
    ? { aspectRatio: `${arNum}`, maxHeight: '70vh' }
    : !isSquare
    ? { maxHeight: '70vh' }
    : undefined;

  return (
    <div className={wrapperClass} style={wrapperStyle} data-feed-video-id={coordId}>
      {/* Blurred backdrop layer */}
      {showBackdrop && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {poster ? (
            <img
              src={poster}
              alt=""
              className="w-full h-full object-cover blur-xl opacity-40 scale-110"
              aria-hidden="true"
            />
          ) : (
            <video
              src={src}
              muted
              playsInline
              className="w-full h-full object-cover blur-xl opacity-40 scale-110"
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Foreground video */}
      <div className={cn(
        showBackdrop ? 'relative z-10' : 'w-full',
        isPortraitRectangle ? 'h-full aspect-[9/16]' : 'w-full h-full'
      )}>
        {isChunked ? (
          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
            <ChunkedVideoPlayer
              manifestUrl={src}
              className="w-full h-full"
              autoPlay={false}
              controls
            />
          </Suspense>
        ) : (
          <FacebookVideoPlayer
            src={src}
            poster={poster}
            className="w-full h-full"
            compact={compact}
            mutedByDefault
            autoPlayInView
            objectFit={resolvedObjectFit}
            onPlayStart={handlePlayStart}
            onVideoMetadata={handleVideoMetadata}
            onError={onError}
          />
        )}
      </div>

      {/* LIVE Replay badge + download */}
      {isLiveReplay && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2.5 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
            <Radio className="w-3.5 h-3.5" />
            LIVE Replay
          </div>
          {isChunked ? (
            <button
              onClick={(e) => { e.stopPropagation(); downloadChunkedVideo(src); }}
              className="pointer-events-auto w-9 h-9 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              title="Tải xuống"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <a
              href={src}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-9 h-9 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              title="Tải xuống"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
});

FeedVideoPlayer.displayName = 'FeedVideoPlayer';
