import { memo } from 'react';
import tetVideo from '@/assets/tet-background.mp4';

/**
 * Tết Background Video Component
 * Video nền hoa mai/đào động, hiển thị từ dưới navbar (3cm) xuống
 * Hoa mai/đào hiện rõ nét ở các góc màn hình, năng lượng sang trọng
 */
export const TetBackground = memo(() => {
  return (
    <div 
      className="fixed inset-x-0 bottom-0 overflow-hidden pointer-events-none"
      style={{ 
        zIndex: -100,
        top: '3cm' // Bắt đầu từ dưới navbar
      }}
    >
      {/* Video nền - scale lớn hơn để hoa mai rõ nét hơn ở các góc */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute w-full h-full object-cover"
        style={{
          transform: 'scale(1.05)', // Phóng to nhẹ để hoa rõ nét hơn ở góc
          transformOrigin: 'center center'
        }}
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      
      {/* Gradient overlay: trong suốt ở 4 góc để thấy hoa rõ, mờ ở giữa để đọc chữ */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 70% 70% at center,
              rgba(255,255,255,0.85) 0%,
              rgba(255,255,255,0.7) 40%,
              rgba(255,255,255,0.3) 70%,
              rgba(255,255,255,0.05) 100%
            )
          `
        }}
      />
      
      {/* Thêm lớp gradient ngang để tăng độ rõ ở 2 bên */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.5) 20%,
              rgba(255,255,255,0.65) 50%,
              rgba(255,255,255,0.5) 80%,
              rgba(255,255,255,0) 100%
            )
          `
        }}
      />
      
      {/* Hiệu ứng ánh sáng vàng nhẹ - sang trọng Tết */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(
              circle at 10% 10%,
              rgba(255, 215, 0, 0.3) 0%,
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(255, 215, 0, 0.3) 0%,
              transparent 30%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(255, 215, 0, 0.2) 0%,
              transparent 25%
            ),
            radial-gradient(
              circle at 90% 90%,
              rgba(255, 215, 0, 0.2) 0%,
              transparent 25%
            )
          `
        }}
      />
    </div>
  );
});

TetBackground.displayName = 'TetBackground';

export default TetBackground;
