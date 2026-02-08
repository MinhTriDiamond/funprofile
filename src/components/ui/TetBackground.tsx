import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Responsive: Video luôn cover toàn bộ màn hình khi phóng to/thu nhỏ
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -100 }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* Overlay nhẹ để nội dung dễ đọc hơn */}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
