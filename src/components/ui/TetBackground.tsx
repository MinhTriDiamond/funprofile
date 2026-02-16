import { memo } from 'react';
import { useTetBackground } from '@/contexts/TetBackgroundContext';
import tetBg1 from '@/assets/tet-bg-1.mp4';
import tetBg2 from '@/assets/tet-bg-2.mp4';
import tetBg3 from '@/assets/tet-bg-3.mp4';
import tetBg4 from '@/assets/tet-bg-4.mp4';
import tetBg5 from '@/assets/tet-bg-5.mp4';
import tetBg6 from '@/assets/tet-bg-6.mp4';

const videos = [tetBg1, tetBg2, tetBg3, tetBg4, tetBg5, tetBg6];

export const TetBackground = memo(() => {
  const { selectedBg } = useTetBackground();
  const src = videos[selectedBg] || videos[0];

  return (
    <div 
      className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none tet-background-container"
      style={{ zIndex: -100 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-secondary via-background to-background" />
      
      {/* Single fullscreen video */}
      <div className="absolute inset-0">
        <video
          key={src}
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
          className="h-full w-full"
          aria-hidden="true"
          style={{
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            objectFit: 'cover',
            objectPosition: 'center center',
            filter: 'saturate(1.15) contrast(1.08) brightness(1.02)',
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
