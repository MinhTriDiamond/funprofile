/**
 * Floating "RICH" text animation overlay for celebration cards.
 * Renders multiple RICH labels with rainbow colors that float around the card.
 */
const RICH_COLORS = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF',
  '#0000FF', '#8B00FF', '#FF1493', '#FFD700',
];

const RICH_POSITIONS = [
  { left: '5%', top: '10%', delay: '0s', size: 'text-lg' },
  { left: '75%', top: '5%', delay: '0.5s', size: 'text-xl' },
  { left: '85%', top: '40%', delay: '1s', size: 'text-base' },
  { left: '10%', top: '60%', delay: '1.5s', size: 'text-xl' },
  { left: '70%', top: '75%', delay: '0.3s', size: 'text-lg' },
  { left: '40%', top: '85%', delay: '0.8s', size: 'text-base' },
  { left: '20%', top: '35%', delay: '1.2s', size: 'text-lg' },
  { left: '60%', top: '25%', delay: '0.6s', size: 'text-xl' },
  { left: '50%', top: '55%', delay: '1.8s', size: 'text-base' },
];

export const RichTextOverlay = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[200]">
    {RICH_POSITIONS.map((pos, i) => (
      <span
        key={i}
        className={`absolute font-black ${pos.size} animate-rich-float select-none`}
        style={{
          left: pos.left,
          top: pos.top,
          animationDelay: pos.delay,
          color: RICH_COLORS[i % RICH_COLORS.length],
          textShadow: `0 0 8px ${RICH_COLORS[i % RICH_COLORS.length]}80, 0 2px 4px rgba(0,0,0,0.5)`,
          WebkitTextStroke: '0.5px rgba(0,0,0,0.3)',
        }}
      >
        RICH
      </span>
    ))}
  </div>
);
