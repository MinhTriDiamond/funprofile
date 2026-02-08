import { memo } from 'react';

/**
 * Hoa mai/đào trang trí cố định ở 2 góc màn hình
 * Sử dụng CSS gradient để tạo hiệu ứng hoa xuyên thấu vào nội dung
 * Hiển thị rõ ràng trên cả desktop và mobile
 */
export const TetFlowerOverlay = memo(() => {
  return (
    <>
      {/* Gradient fade bên trái - cho phép video xuyên thấu */}
      <div 
        className="fixed top-0 left-0 bottom-0 w-8 sm:w-12 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to right, transparent 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      
      {/* Gradient fade bên phải - cho phép video xuyên thấu */}
      <div 
        className="fixed top-0 right-0 bottom-0 w-8 sm:w-12 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(to left, transparent 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Decorative glow effect góc trái dưới */}
      <div 
        className="fixed bottom-16 left-0 w-24 h-32 sm:w-32 sm:h-40 pointer-events-none z-[5] opacity-60"
        style={{
          background: 'radial-gradient(ellipse at bottom left, hsl(350 80% 70% / 0.3) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      
      {/* Decorative glow effect góc phải dưới */}
      <div 
        className="fixed bottom-16 right-0 w-24 h-32 sm:w-32 sm:h-40 pointer-events-none z-[5] opacity-60"
        style={{
          background: 'radial-gradient(ellipse at bottom right, hsl(45 90% 60% / 0.3) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </>
  );
});

TetFlowerOverlay.displayName = 'TetFlowerOverlay';

export default TetFlowerOverlay;
