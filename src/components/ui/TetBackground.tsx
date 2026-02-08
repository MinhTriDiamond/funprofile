import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Hoa mai/đào hiện rõ nét ở 2 bên góc màn hình - KHÔNG CÓ OVERLAY che phủ
 * Tăng cường màu sắc cho hoa tươi sáng như thật
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
        className="tet-video absolute top-0 md:top-12 left-1/2 w-auto h-auto min-w-full min-h-full object-cover"
        style={{
          transform: 'translateX(-50%)',
          willChange: 'transform',
          minHeight: '100dvh',
        }}
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* No overlay - hoa mai/đào hiển thị rõ nét 100% */}
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
