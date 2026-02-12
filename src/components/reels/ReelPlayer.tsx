import { useRef, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ReelPlayerProps {
  videoUrl: string;
  isActive: boolean;
  isMuted: boolean;
}

const ReelPlayer = ({ videoUrl, isActive, isMuted }: ReelPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive, hasError]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <AlertTriangle className="w-12 h-12 text-yellow-400" />
        <p className="text-sm text-muted-foreground">Video không thể tải được</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className="w-full h-full object-contain"
      loop
      playsInline
      muted={isMuted}
      preload="metadata"
      onError={() => setHasError(true)}
    />
  );
};

export default ReelPlayer;
