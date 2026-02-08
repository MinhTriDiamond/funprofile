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
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* Mask để chỉ hiện hoa ở 2 góc: góc trái trên (logo) và góc phải trên (avatar) */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 40% 60% at 0% 0%, transparent 0%, white 70%),
            radial-gradient(ellipse 40% 60% at 100% 0%, transparent 0%, white 70%),
            white
          `,
          backgroundBlendMode: 'multiply'
        }}
      />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
