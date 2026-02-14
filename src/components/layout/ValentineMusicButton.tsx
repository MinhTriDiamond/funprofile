import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Music, VolumeX, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface ValentineMusicButtonProps {
  variant?: 'desktop' | 'mobile';
}

export const ValentineMusicButton = memo(({ variant = 'desktop' }: ValentineMusicButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayAttempted = useRef(false);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/valentine.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Autoplay on mount — browsers may block this without user interaction,
  // so we also listen for the first user click/touch to retry.
  useEffect(() => {
    if (autoplayAttempted.current) return;
    autoplayAttempted.current = true;

    ensureAudio();
    if (!audioRef.current) return;

    audioRef.current.volume = volume;
    audioRef.current.currentTime = 0;
    const playPromise = audioRef.current.play();

    if (playPromise) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Browser blocked autoplay — wait for first interaction
          const resumeOnInteraction = () => {
            if (audioRef.current && !audioRef.current.paused) return;
            ensureAudio();
            if (!audioRef.current) return;
            audioRef.current.volume = volume;
            audioRef.current.currentTime = 0;
            audioRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
            document.removeEventListener('click', resumeOnInteraction);
            document.removeEventListener('touchstart', resumeOnInteraction);
          };
          document.addEventListener('click', resumeOnInteraction, { once: true });
          document.addEventListener('touchstart', resumeOnInteraction, { once: true });
        });
    }
  }, [ensureAudio, volume]);

  const toggle = useCallback(() => {
    ensureAudio();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.volume = volume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, volume, ensureAudio]);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowVolume(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setShowVolume(false), 1200);
  }, []);

  if (variant === 'mobile') {
    return (
      <div className="relative flex flex-col items-center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
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
            <VolumeX className="w-6 h-6 animate-spin" strokeWidth={1.8} style={{ animationDuration: '2s' }} />
          ) : (
            <Music className="w-6 h-6" strokeWidth={1.8} />
          )}
          <span className="text-[10px] mt-1 font-medium">Nhạc</span>
        </button>
        {isPlaying && showVolume && (
          <div className="absolute top-full mt-2 bg-card border border-border rounded-lg p-2 shadow-lg z-50 w-28">
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc Valentine'}
        className={`fun-icon-btn-gold group relative ${isPlaying ? 'ring-2 ring-destructive/50' : ''}`}
      >
        {isPlaying ? (
          <Volume2 className="w-5 h-5 text-destructive drop-shadow-[0_0_6px_rgba(220,38,38,0.5)] animate-spin" style={{ animationDuration: '2s' }} />
        ) : (
          <Music className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
        )}
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
        )}
      </button>
      {isPlaying && showVolume && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-2 shadow-lg z-50 w-28">
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
});

ValentineMusicButton.displayName = 'ValentineMusicButton';
