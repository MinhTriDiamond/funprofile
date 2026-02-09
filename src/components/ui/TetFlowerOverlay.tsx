import { memo } from 'react';

/**
 * Hoa mai/đào trang trí cố định ở 2 góc màn hình
 * Sử dụng CSS gradient để tạo hiệu ứng hoa xuyên thấu vào nội dung
 * Hiển thị rõ ràng trên cả desktop và mobile
 */
export const TetFlowerOverlay = memo(() => {
  return (
    <div>
      {/* Góc trái trên - hoa mai */}
      <div 
        className="fixed top-14 left-0 w-44 h-52 md:w-56 md:h-64 pointer-events-none z-[5] opacity-90"
        style={{
          background: 'radial-gradient(ellipse at top left, hsl(350 80% 70% / 0.45) 0%, hsl(350 70% 65% / 0.2) 40%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      {/* Góc phải trên - hoa đào */}
      <div 
        className="fixed top-14 right-0 w-44 h-52 md:w-56 md:h-64 pointer-events-none z-[5] opacity-90"
        style={{
          background: 'radial-gradient(ellipse at top right, hsl(45 90% 60% / 0.45) 0%, hsl(40 85% 55% / 0.2) 40%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      {/* Góc trái dưới - lồng đèn đỏ */}
      <div 
        className="fixed bottom-16 left-0 w-48 h-56 md:w-60 md:h-72 pointer-events-none z-[5] opacity-85"
        style={{
          background: 'radial-gradient(ellipse at bottom left, hsl(350 80% 65% / 0.5) 0%, hsl(350 75% 60% / 0.25) 35%, transparent 72%)',
        }}
        aria-hidden="true"
      />
      
      {/* Góc phải dưới - lồng đèn vàng */}
      <div 
        className="fixed bottom-16 right-0 w-48 h-56 md:w-60 md:h-72 pointer-events-none z-[5] opacity-85"
        style={{
          background: 'radial-gradient(ellipse at bottom right, hsl(45 90% 58% / 0.5) 0%, hsl(43 85% 50% / 0.25) 35%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      {/* Glow trung tâm nhẹ - desktop only */}
      <div 
        className="hidden md:block fixed top-1/3 left-0 w-40 h-80 pointer-events-none z-[5] opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center left, hsl(350 70% 70% / 0.3) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div 
        className="hidden md:block fixed top-1/3 right-0 w-40 h-80 pointer-events-none z-[5] opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center right, hsl(45 80% 60% / 0.3) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
});

TetFlowerOverlay.displayName = 'TetFlowerOverlay';

export default TetFlowerOverlay;
