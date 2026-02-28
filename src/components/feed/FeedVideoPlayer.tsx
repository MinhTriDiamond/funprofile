import { memo, useEffect, useId, useCallback, lazy, Suspense } from 'react';
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
  aspectRatio?: number; // w/h e.g. 16/9
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
  isLiveReplay = false,
  itemId,
  feedId,
  className,
  compact = false,
  onError,
}: FeedVideoPlayerProps) => {
  const autoId = useId();
  const coordId = itemId || feedId || autoId;

  // Register with coordinator
  useEffect(() => {
    // We register a no-op initially; the real pause comes from onPause in FacebookVideoPlayer
    // The coordinator will call this to pause video
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
  const objectFit = isSquare ? 'cover' as const : 'contain' as const;

  const wrapperClass = cn(
    'relative overflow-hidden',
    isSquare ? 'aspect-square' : '',
    className
  );

  const wrapperStyle = !isSquare && aspectRatio
    ? { aspectRatio: `${aspectRatio}`, maxHeight: '70vh' }
    : !isSquare
    ? { maxHeight: '70vh' }
    : undefined;

  return (
    <div className={wrapperClass} style={wrapperStyle} data-feed-video-id={coordId}>
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
          objectFit={objectFit}
          onPlayStart={handlePlayStart}
          onError={onError}
        />
      )}

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
