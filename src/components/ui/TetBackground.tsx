import { memo } from 'react';
import bgVideo from '@/assets/vale.mp4';

/**
 * Valentine Background Video Component
 * 3 video cạnh nhau để phủ kín màn hình desktop
 * Mobile: chỉ hiện 1 video contain
 */

const VideoElement = ({ className = '' }: { className?: string }) => (
  <video
    autoPlay
    loop
    muted
    playsInline
    webkit-playsinline="true"
    x5-playsinline="true"
    x5-video-player-type="h5"
    x5-video-player-fullscreen="false"
    disablePictureInPicture
    disableRemotePlayback
    preload="auto"
    className={`tet-video h-full flex-shrink-0 ${className}`}
    aria-hidden="true"
    style={{
      WebkitTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
    }}
  >
    <source src={bgVideo} type="video/mp4" />
  </video>
);

export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none tet-background-container"
      style={{ zIndex: -100 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-secondary via-background to-background" />
      
      {/* Desktop: 3 video cạnh nhau phủ kín */}
      <div className="hidden md:flex absolute inset-0 justify-center items-center">
        <VideoElement />
        <VideoElement />
        <VideoElement />
      </div>

      {/* Mobile: 1 video contain */}
      <div className="md:hidden absolute inset-0 flex justify-center items-center">
        <VideoElement className="w-full" />
      </div>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
