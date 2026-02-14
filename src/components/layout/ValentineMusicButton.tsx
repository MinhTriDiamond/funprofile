import { useState, useRef, useCallback, memo } from 'react';
import { Music, VolumeX } from 'lucide-react';

interface ValentineMusicButtonProps {
  variant?: 'desktop' | 'mobile';
}

export const ValentineMusicButton = memo(({ variant = 'desktop' }: ValentineMusicButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/valentine.mp3');
      audioRef.current.loop = true;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (variant === 'mobile') {
    return (
      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc Valentine'}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border-[0.5px] ${
          isPlaying
            ? 'text-white bg-destructive border-destructive'
            : 'text-foreground hover:text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive/40'
        }`}
      >
        {isPlaying ? (
          <VolumeX className="w-6 h-6" strokeWidth={1.8} />
        ) : (
          <Music className="w-6 h-6" strokeWidth={1.8} />
        )}
        <span className="text-[10px] mt-1 font-medium">Nhạc</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc Valentine'}
      className={`fun-icon-btn-gold group relative ${isPlaying ? 'ring-2 ring-destructive/50' : ''}`}
    >
      {isPlaying ? (
        <VolumeX className="w-5 h-5 text-destructive drop-shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
      ) : (
        <Music className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
      )}
      {isPlaying && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
      )}
    </button>
  );
});

ValentineMusicButton.displayName = 'ValentineMusicButton';
