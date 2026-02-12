/**
 * Floating "RICH" text animation overlay for celebration cards.
 * Renders as a fixed full-screen layer above Dialog portals.
 */
const RICH_COLORS = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF',
  '#0000FF', '#8B00FF', '#FF1493', '#FFD700',
];

const RICH_POSITIONS = [
  { left: '3%', top: '8%', delay: '0s', size: 'text-3xl' },
  { left: '78%', top: '3%', delay: '0.5s', size: 'text-4xl' },
  { left: '88%', top: '35%', delay: '1s', size: 'text-2xl' },
  { left: '8%', top: '55%', delay: '1.5s', size: 'text-4xl' },
  { left: '72%', top: '70%', delay: '0.3s', size: 'text-3xl' },
  { left: '35%', top: '88%', delay: '0.8s', size: 'text-2xl' },
  { left: '18%', top: '30%', delay: '1.2s', size: 'text-3xl' },
  { left: '62%', top: '20%', delay: '0.6s', size: 'text-4xl' },
  { left: '48%', top: '50%', delay: '1.8s', size: 'text-2xl' },
  { left: '25%', top: '75%', delay: '0.4s', size: 'text-3xl' },
  { left: '55%', top: '92%', delay: '1.1s', size: 'text-4xl' },
  { left: '90%', top: '60%', delay: '0.7s', size: 'text-3xl' },
  { left: '42%', top: '12%', delay: '1.4s', size: 'text-2xl' },
  { left: '15%', top: '90%', delay: '0.9s', size: 'text-4xl' },
  { left: '68%', top: '45%', delay: '1.6s', size: 'text-3xl' },
];

export const RichTextOverlay = () => (
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
          textShadow: `0 0 12px ${RICH_COLORS[i % RICH_COLORS.length]}90, 0 0 24px ${RICH_COLORS[i % RICH_COLORS.length]}50, 0 2px 4px rgba(0,0,0,0.6)`,
          WebkitTextStroke: '0.5px rgba(0,0,0,0.3)',
        }}
      >
        RICH
      </span>
    ))}
  </div>
);
