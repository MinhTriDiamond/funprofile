import { useRef, useEffect } from 'react';

interface ReelPlayerProps {
  videoUrl: string;
  isActive: boolean;
  isMuted: boolean;
}

const ReelPlayer = ({ videoUrl, isActive, isMuted }: ReelPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className="w-full h-full object-contain"
      loop
      playsInline
      muted={isMuted}
      preload="metadata"
    />
  );
};

export default ReelPlayer;
