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
      style={{ zIndex: -100 }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-[15%] left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover"
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* Overlay rất nhẹ để hoa mai hoa đào hiện rõ nét */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.35) 20%,
              rgba(255,255,255,0.45) 50%,
              rgba(255,255,255,0.35) 80%,
              rgba(255,255,255,0) 100%
            )
          `
        }}
      />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
