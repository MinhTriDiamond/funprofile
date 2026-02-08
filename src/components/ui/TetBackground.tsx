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
        className="absolute top-0 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover object-top"
        aria-hidden="true"
      >
        <source src={tetVideo} type="video/mp4" />
      </video>
      {/* 
        Overlay gradient cực nhẹ - chỉ làm mờ nhẹ ở vùng giữa để text dễ đọc
        Hai bên hoàn toàn trong suốt để hoa mai/đào hiển thị rõ nét 100%
      */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0) 20%,
              rgba(255,255,255,0.4) 35%,
              rgba(255,255,255,0.5) 50%,
              rgba(255,255,255,0.4) 65%,
              rgba(255,255,255,0) 80%,
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
