import { memo } from 'react';
import bgVideo from '@/assets/vale.mp4';

/**
 * Valentine Background Video Component
 * Video nền thiên thần Valentine, hiển thị phía dưới tất cả nội dung
 * Thiên thần hiện rõ nét ở giữa màn hình - KHÔNG CÓ OVERLAY che phủ
 * 
 * Desktop & Mobile: object-fit: contain để KHÔNG crop mất thiên thần
 * 
 * Tương thích: iOS Safari, Chrome, Firefox, Edge
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none tet-background-container"
      style={{ zIndex: -100 }}
    >
      {/* Nền phụ để lấp khoảng trống khi contain */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary via-background to-background" />
      
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
        className="tet-video absolute inset-0 w-full h-full"
        aria-hidden="true"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          backgroundColor: 'hsl(45 30% 97%)',
        }}
      >
        <source src={bgVideo} type="video/mp4" />
      </video>
      {/* No overlay - thiên thần hiển thị rõ nét 100% */}
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
