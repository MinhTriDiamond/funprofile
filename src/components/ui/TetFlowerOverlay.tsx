import { memo } from 'react';

/**
 * Hoa mai/đào trang trí cố định ở 2 góc màn hình
 * Sử dụng CSS gradient để tạo hiệu ứng hoa xuyên thấu vào nội dung
 * Hiển thị rõ ràng trên cả desktop và mobile
 */
export const TetFlowerOverlay = memo(() => {
  return (
    <div className="md:hidden">
      {/* Decorative glow effect góc trái dưới - CHỈ MOBILE */}
      <div 
        className="fixed bottom-16 left-0 w-32 h-40 pointer-events-none z-[5] opacity-80"
        style={{
          background: 'radial-gradient(ellipse at bottom left, hsl(350 80% 70% / 0.4) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      
      {/* Decorative glow effect góc phải dưới - CHỈ MOBILE */}
      <div 
        className="fixed bottom-16 right-0 w-32 h-40 pointer-events-none z-[5] opacity-80"
        style={{
          background: 'radial-gradient(ellipse at bottom right, hsl(45 90% 60% / 0.4) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
});

TetFlowerOverlay.displayName = 'TetFlowerOverlay';

export default TetFlowerOverlay;
