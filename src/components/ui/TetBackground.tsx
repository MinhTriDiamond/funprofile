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

      {/* HAPPY VALENTINE'S DAY text - dưới header */}
      <div 
        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none pt-1 md:pt-2"
        style={{ zIndex: 1 }}
      >
        <div className="text-center">
          <h1 
            className="text-2xl md:text-5xl lg:text-6xl font-black tracking-wider uppercase"
            style={{
              background: 'linear-gradient(135deg, #8B0000 0%, #DC143C 18%, #FF2D2D 35%, #FFB3B3 48%, #FF2D2D 52%, #DC143C 65%, #B22222 82%, #8B0000 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: '0.12em',
              WebkitTextStroke: '0.3px rgba(139,0,0,0.3)',
              filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6))',
            }}
          >
            Happy Valentine's Day
          </h1>
          <p 
            className="text-lg md:text-3xl lg:text-4xl font-black tracking-widest uppercase mt-0"
            style={{
              background: 'linear-gradient(135deg, #8B0000 0%, #DC143C 18%, #FF2D2D 35%, #FFB3B3 48%, #FF2D2D 52%, #DC143C 65%, #B22222 82%, #8B0000 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: '0.15em',
              WebkitTextStroke: '0.3px rgba(139,0,0,0.3)',
              filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6))',
            }}
          >
            From FUN.RICH
          </p>
        </div>
      </div>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
