import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Hoa mai/đào hiện rõ nét ở 2 bên góc màn hình - KHÔNG CÓ OVERLAY che phủ
 * 
 * Mobile: object-fit: contain để KHÔNG crop hoa/lồng đèn
 * Desktop: object-fit: cover để full-screen đẹp
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none tet-background-container"
      style={{ zIndex: -100 }}
    >
      {/* Nền phụ để lấp khoảng trống khi contain trên mobile */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary via-background to-background" />
      
      <video
        autoPlay
        loop
        muted
        playsInline
        className="tet-video absolute inset-0 w-full h-full"
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
