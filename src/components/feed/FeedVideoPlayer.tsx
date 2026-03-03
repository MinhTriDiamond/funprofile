import { memo, useEffect, useId, useCallback, useMemo, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { FacebookVideoPlayer } from '@/components/ui/FacebookVideoPlayer';
import { videoPlaybackCoordinator } from './videoPlaybackCoordinator';
import { Radio, Download } from 'lucide-react';
import { downloadChunkedVideo } from '@/utils/chunkedVideoDownload';

const ChunkedVideoPlayer = lazy(() =>
  import('@/modules/live/components/ChunkedVideoPlayer').then(mod => ({ default: mod.ChunkedVideoPlayer }))
);

/* R2 URL normalizer */
const R2_DEV_PATTERN = /https:\/\/pub-[a-f0-9]+\.r2\.dev/g;
const R2_CUSTOM_DOMAIN = 'https://media.fun.rich';
function normalizeR2Url(url: string): string {
  return url.replace(R2_DEV_PATTERN, R2_CUSTOM_DOMAIN);
}

function isChunkedManifestUrl(url: string): boolean {
  return url.endsWith('manifest.json') || /\/recordings\/[^/]+\/manifest\.json/.test(url);
}

export interface FeedVideoPlayerProps {
  src: string;
  poster?: string;
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
  isLiveReplay = false,
  itemId,
  feedId,
  className,
  compact = false,
  onError,
}: FeedVideoPlayerProps) => {
  const autoId = useId();
  const coordId = itemId || feedId || autoId;
  const normalizedSrc = useMemo(() => normalizeR2Url(src), [src]);
  const isChunked = isChunkedManifestUrl(normalizedSrc);

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

  return (
    <div
      className={cn(
        'relative w-full aspect-square overflow-hidden rounded-xl bg-black',
        className
      )}
      data-feed-video-id={coordId}
    >
      {/* Layer 1: Blurred backdrop (always visible) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-35 scale-110"
            aria-hidden="true"
          />
        ) : (
          <video
            src={normalizedSrc}
            muted
            playsInline
            className="w-full h-full object-cover blur-2xl opacity-35 scale-110"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Layer 2: Foreground video (object-contain, always) */}
      <div className="relative z-10 w-full h-full">
        {isChunked ? (
          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
            <ChunkedVideoPlayer
              manifestUrl={normalizedSrc}
              className="w-full h-full"
              autoPlay={false}
              controls
            />
          </Suspense>
        ) : (
          <FacebookVideoPlayer
            src={normalizedSrc}
            poster={poster}
            className="w-full h-full"
            compact={compact}
            mutedByDefault
            autoPlayInView
            objectFit="contain"
            onPlayStart={handlePlayStart}
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
