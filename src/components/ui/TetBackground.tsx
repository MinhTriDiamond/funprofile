import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị ở LỚP TRÊN CÙNG (foreground)
 * Sử dụng mask để hoa mai/đào hiện rõ nét ở 2 bên góc màn hình
 * Phần giữa trong suốt để nội dung vẫn hiển thị và tương tác được
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
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          // Mask: hiển thị rõ ở 4 góc, ẩn dần về giữa
          maskImage: `
            radial-gradient(
              ellipse 60% 70% at center,
              transparent 0%,
              transparent 30%,
              rgba(0,0,0,0.3) 50%,
              rgba(0,0,0,0.7) 70%,
              black 90%
            )
          `,
          WebkitMaskImage: `
            radial-gradient(
              ellipse 60% 70% at center,
              transparent 0%,
              transparent 30%,
              rgba(0,0,0,0.3) 50%,
              rgba(0,0,0,0.7) 70%,
              black 90%
            )
          `
        }}
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
