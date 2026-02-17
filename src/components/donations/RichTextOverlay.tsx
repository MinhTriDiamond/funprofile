import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const RICH_COLORS = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF',
  '#0000FF', '#8B00FF', '#FF1493', '#FFD700',
];

const RICH_POSITIONS = [
  { left: '5%', top: '10%', delay: '0s', size: 'text-3xl' },
  { left: '80%', top: '5%', delay: '0.8s', size: 'text-4xl' },
  { left: '90%', top: '40%', delay: '1.6s', size: 'text-2xl' },
  { left: '10%', top: '60%', delay: '0.4s', size: 'text-4xl' },
  { left: '75%', top: '75%', delay: '1.2s', size: 'text-3xl' },
  { left: '40%', top: '90%', delay: '0.6s', size: 'text-2xl' },
  { left: '20%', top: '35%', delay: '1.4s', size: 'text-3xl' },
  { left: '60%', top: '20%', delay: '1.0s', size: 'text-5xl' },
  { left: '50%', top: '50%', delay: '1.8s', size: 'text-3xl' },
  { left: '30%', top: '80%', delay: '0.2s', size: 'text-4xl' },
];

export const RichTextOverlay = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[9999]">
      {RICH_POSITIONS.map((pos, i) => (
        <span
          key={i}
          className={`absolute font-black ${pos.size} animate-rich-float select-none`}
          style={{
            left: pos.left,
            top: pos.top,
            animationDelay: pos.delay,
            color: RICH_COLORS[i % RICH_COLORS.length],
            textShadow: `0 0 20px ${RICH_COLORS[i % RICH_COLORS.length]}DD, 0 0 40px ${RICH_COLORS[i % RICH_COLORS.length]}AA, 0 0 60px ${RICH_COLORS[i % RICH_COLORS.length]}80, 0 2px 4px rgba(0,0,0,0.8)`,
            WebkitTextStroke: '1px rgba(0,0,0,0.4)',
            filter: 'brightness(1.4)',
          }}
        >
          RICH
        </span>
      ))}
    </div>,
    document.body,
  );
};
