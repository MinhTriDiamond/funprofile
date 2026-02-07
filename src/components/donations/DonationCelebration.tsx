import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Coins } from 'lucide-react';

interface DonationCelebrationProps {
  isActive: boolean;
}

export const DonationCelebration = ({ isActive }: DonationCelebrationProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial burst
    const fireConfetti = () => {
      // Left side
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.2, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#22c55e', '#a855f7'],
      });

      // Right side
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.8, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#22c55e', '#a855f7'],
      });

      // Center top
      confetti({
        particleCount: 30,
        spread: 100,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#FFD700', '#FFA500', '#22c55e'],
        scalar: 1.2,
      });
    };

    // Fire immediately
    fireConfetti();

    // Then fire every 800ms
    intervalRef.current = setInterval(fireConfetti, 800);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Falling coins animation */}
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
            <Coins
              className="w-6 h-6 text-gold animate-spin-slow"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))',
              }}
            />
          </div>
        ))}
      </div>

      {/* Sparkle effects */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 bg-gold rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
