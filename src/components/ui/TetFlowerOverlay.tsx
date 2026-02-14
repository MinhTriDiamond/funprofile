import { memo } from 'react';

/**
 * Valentine decorative glow effects ở 2 góc màn hình
 * Hiển thị trên mobile để tạo không khí Valentine
 */
export const TetFlowerOverlay = memo(() => {
  return (
    <div className="md:hidden">
      {/* Valentine glow góc trái dưới - CHỈ MOBILE */}
      <div 
        className="fixed bottom-16 left-0 w-36 h-44 pointer-events-none z-[5] opacity-70"
        style={{
          background: 'radial-gradient(ellipse at bottom left, hsl(340 80% 55% / 0.35) 0%, hsl(350 90% 70% / 0.15) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      
      {/* Valentine glow góc phải dưới - CHỈ MOBILE */}
      <div 
        className="fixed bottom-16 right-0 w-36 h-44 pointer-events-none z-[5] opacity-70"
        style={{
          background: 'radial-gradient(ellipse at bottom right, hsl(340 80% 55% / 0.35) 0%, hsl(350 90% 70% / 0.15) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
});

TetFlowerOverlay.displayName = 'TetFlowerOverlay';

export default TetFlowerOverlay;
