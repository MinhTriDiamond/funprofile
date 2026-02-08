import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị phía sau nội dung
 * Hoa mai/đào hiện rõ nét ở 2 bên góc màn hình
 * Nội dung vẫn rõ ràng và dễ đọc
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Video nền full màn hình */}
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
      
      {/* Lớp phủ: trong suốt ở góc để thấy hoa, mờ nhẹ ở giữa để đọc nội dung */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 50% 50% at center,
              rgba(255,255,255,0.85) 0%,
              rgba(255,255,255,0.7) 40%,
              rgba(255,255,255,0.3) 70%,
              transparent 100%
            )
          `
        }}
      />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

