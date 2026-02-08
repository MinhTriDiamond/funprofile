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
        className="absolute top-0 left-1/2 w-auto h-auto min-w-full min-h-full object-cover object-center"
        style={{
          // Scale lớn hơn để hoa mai/đào hiển thị rõ ở các góc
          transform: 'translateX(-50%) scale(1.15)',
          // Tăng độ tươi sắc màu hoa mai/hoa đào như hoa thật
          filter: 'saturate(1.25) contrast(1.12) brightness(1.05)',
          // Tối ưu render video mượt mà
          willChange: 'transform',
          // Mobile: đảm bảo video full viewport
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
