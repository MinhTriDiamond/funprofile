import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Foreground Video Component
 * Video hoa mai/đào động, hiển thị NỔI TRÊN nội dung
 * Hoa mai/đào hiện rõ nét 100% ở 2 góc trên (logo bên trái, avatar bên phải)
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
        aria-hidden="true"
        style={{
          /* Mask: làm mờ vùng giữa, hiện rõ 100% ở 2 góc trên */
          maskImage: `
            radial-gradient(
              ellipse 60% 80% at 50% 50%,
              transparent 0%,
              transparent 40%,
              black 70%,
              black 100%
            )
          `,
          WebkitMaskImage: `
            radial-gradient(
              ellipse 60% 80% at 50% 50%,
              transparent 0%,
              transparent 40%,
              black 70%,
              black 100%
            )
          `
        }}
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
