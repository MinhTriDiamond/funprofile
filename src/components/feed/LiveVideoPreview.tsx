import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRtc } from '@/modules/live/hooks/useLiveRtc';
import { Loader2 } from 'lucide-react';

interface LiveVideoPreviewProps {
  sessionId: string;
  onVideoReady?: (ready: boolean) => void;
}

export const LiveVideoPreview = ({ sessionId, onVideoReady }: LiveVideoPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // IntersectionObserver: only connect when 50% visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const {
    remoteContainerRef,
    hasRemoteVideo,
    isJoined,
    statusText,
    start,
    leave,
  } = useLiveRtc({
    sessionId,
    role: 'audience',
    enabled: isVisible,
  });

  // Start/leave based on visibility
  useEffect(() => {
    if (isVisible && !hasStarted) {
      setHasStarted(true);
      start().catch(() => undefined);
    }
    if (!isVisible && hasStarted) {
      setHasStarted(false);
      leave().catch(() => undefined);
    }
  }, [isVisible, hasStarted, start, leave]);

  // Notify parent when remote video is available
  useEffect(() => {
    onVideoReady?.(hasRemoteVideo);
  }, [hasRemoteVideo, onVideoReady]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {/* Agora remote video container */}
      <div
        ref={remoteContainerRef}
        className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
      />

      {/* Loading state when joined but no video yet */}
      {isJoined && !hasRemoteVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs">{statusText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
