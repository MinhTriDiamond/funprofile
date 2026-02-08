import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 */
export const TetBackground = memo(() => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* Overlay nhẹ để nội dung dễ đọc hơn */}
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
