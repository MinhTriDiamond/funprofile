import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía dưới tất cả nội dung
 * Hoa mai/đào hiện rõ nét, đậm màu, sang trọng ở 4 góc màn hình
 * Cố định vị trí khi phóng to/thu nhỏ
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -100 }}
    >
      {/* Video nền với filter tăng độ đậm, tươi sáng */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'saturate(1.4) contrast(1.1) brightness(1.05)',
        }}
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      
      {/* Radial gradient: trong suốt hoàn toàn ở 4 góc để hoa mai/đào rực rỡ */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 60% 70% at 50% 50%,
              rgba(255,255,255,0.82) 0%,
              rgba(255,255,255,0.7) 40%,
              rgba(255,255,255,0.3) 70%,
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
