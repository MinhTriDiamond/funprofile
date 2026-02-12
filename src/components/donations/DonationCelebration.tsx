import { useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Coins } from 'lucide-react';

const RAINBOW_COLORS = [
  '#FF0000', '#FF7700', '#FFD700',
  '#00FF00', '#00BFFF', '#0000FF',
  '#8B00FF', '#FF69B4', '#FFFFFF',
];

interface DonationCelebrationProps {
  isActive: boolean;
  showRichText?: boolean;
}

export const DonationCelebration = ({ isActive, showRichText = false }: DonationCelebrationProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fireworkRef = useRef<NodeJS.Timeout | null>(null);

  const richItems = useMemo(() => 
    [...Array(15)].map((_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 85}%`,
      color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
      delay: `${Math.random() * 3}s`,
      duration: `${3 + Math.random() * 2}s`,
      size: ['text-2xl', 'text-3xl', 'text-4xl'][Math.floor(Math.random() * 3)],
      rotation: Math.random() * 40 - 20,
    })), []);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fireworkRef.current) clearInterval(fireworkRef.current);
      intervalRef.current = null;
      fireworkRef.current = null;
      return;
    }

    const fireConfetti = () => {
      confetti({ particleCount: 80, spread: 60, origin: { x: 0.2, y: 0.6 }, colors: RAINBOW_COLORS });
      confetti({ particleCount: 80, spread: 60, origin: { x: 0.8, y: 0.6 }, colors: RAINBOW_COLORS });
      confetti({ particleCount: 50, spread: 100, origin: { x: 0.5, y: 0.3 }, colors: RAINBOW_COLORS, scalar: 1.2 });
    };

    const fireFirework = () => {
      confetti({
        particleCount: 100,
        spread: 360,
        startVelocity: 45,
        gravity: 1.2,
        ticks: 200,
        origin: { x: 0.2 + Math.random() * 0.6, y: 1 },
        colors: RAINBOW_COLORS,
      });
    };

    fireConfetti();
    fireFirework();
    intervalRef.current = setInterval(fireConfetti, 600);
    fireworkRef.current = setInterval(fireFirework, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fireworkRef.current) clearInterval(fireworkRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {/* Falling coins */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Coins className="w-6 h-6 text-gold animate-spin-slow" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))' }} />
          </div>
        ))}
      </div>

      {/* Sparkles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 bg-gold rounded-full animate-sparkle"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}
          />
        ))}
      </div>

      {/* RICH rainbow text */}
      {showRichText && (
        <div className="absolute inset-0 overflow-hidden">
          {richItems.map((item, i) => (
            <span
              key={`rich-${i}`}
              className={`absolute font-extrabold ${item.size} animate-rich-float select-none`}
              style={{
                left: item.left,
                top: item.top,
                color: item.color,
                animationDelay: item.delay,
                animationDuration: item.duration,
                transform: `rotate(${item.rotation}deg)`,
                textShadow: `1px 1px 2px rgba(0,0,0,0.5), 0 0 4px ${item.color}`,
                WebkitTextStroke: `1px rgba(0,0,0,0.3)`,
              }}
            >
              RICH
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
