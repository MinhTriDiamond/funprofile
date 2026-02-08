import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Hoa mai/đào hiện rõ nét ở 2 bên góc màn hình
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-x-0 top-[3cm] bottom-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -100 }}
    >
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
      {/* Không có lớp phủ - hoa mai/đào hiển thị rõ nét 100% */}
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
