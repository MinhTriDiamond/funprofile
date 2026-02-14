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
    className={`h-full flex-shrink-0 ${className}`}
    aria-hidden="true"
    style={{
      WebkitTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
      objectFit: 'cover',
      objectPosition: 'center center',
      filter: 'saturate(1.15) contrast(1.08) brightness(1.02)',
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
      
      {/* Desktop: 3 video sát nhau phủ kín, không khoảng cách */}
      <div className="hidden md:flex absolute inset-0" style={{ gap: 0 }}>
        <VideoElement className="w-1/3 min-w-0" />
        <VideoElement className="w-1/3 min-w-0" />
        <VideoElement className="w-1/3 min-w-0" />
      </div>

      {/* Mobile: 1 video cover full */}
      <div className="md:hidden absolute inset-0">
        <VideoElement className="w-full" />
      </div>

      {/* HAPPY VALENTINE'S DAY text - canh giữa header và nội dung */}
      <div 
        className="absolute inset-x-0 flex justify-center pointer-events-none"
        style={{ zIndex: 1, top: 'calc(56px + env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <h1 
          className="text-2xl md:text-5xl lg:text-6xl font-black tracking-wider uppercase"
          style={{
            background: 'linear-gradient(135deg, #FF6B9D 0%, #FF1744 20%, #D50000 40%, #FFD700 60%, #FF6F00 80%, #FFB347 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
            letterSpacing: '0.12em',
            filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.8))',
          }}
        >
          Happy Valentine's Day
        </h1>
      </div>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
