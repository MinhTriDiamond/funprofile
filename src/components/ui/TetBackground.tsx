import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Hoa mai/đào hiện rõ nét ở 2 bên góc màn hình - KHÔNG CÓ OVERLAY che phủ
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
        className="tet-video absolute top-12 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover object-top"
        aria-hidden="true"
        style={{
          willChange: 'transform',
          filter: 'saturate(1.15) contrast(1.08)',
        }}
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* No overlay - hoa mai/đào hiển thị rõ nét 100% như hoa thật */}
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
