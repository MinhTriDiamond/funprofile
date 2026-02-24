import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Music, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// ── Singleton state (persists across remounts / page navigations) ──
let globalAudio: HTMLAudioElement | null = null;
let globalVolume = 0.5;
let globalAutoplayDone = true;
let globalUserStopped = false;
let globalResumeListener: (() => void) | null = null;

function ensureAudio(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio('/sounds/tet.mp3');
    globalAudio.loop = true;
    globalAudio.volume = globalVolume;
  }
  return globalAudio;
}

function isAudioPlaying(): boolean {
  return !!globalAudio && !globalAudio.paused;
}

function cleanupResumeListener() {
  if (globalResumeListener) {
    document.removeEventListener('click', globalResumeListener);
    document.removeEventListener('touchstart', globalResumeListener);
    globalResumeListener = null;
  }
}

// ── Component ──
interface ValentineMusicButtonProps {
  variant?: 'desktop' | 'mobile';
}

export const ValentineMusicButton = memo(({ variant = 'desktop' }: ValentineMusicButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(isAudioPlaying);
  const [volume, setVolume] = useState(globalVolume);
  const [showVolume, setShowVolume] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const volumePercent = Math.round(volume * 100);

  // Sync UI via play/pause events on the singleton audio
  useEffect(() => {
    const audio = ensureAudio();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    setIsPlaying(!audio.paused);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Autoplay – runs only once globally
  useEffect(() => {
    if (globalAutoplayDone || globalUserStopped) return;
    globalAutoplayDone = true;

    const audio = ensureAudio();
    audio.volume = globalVolume;
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .catch(() => {
          const resumeOnInteraction = () => {
            globalResumeListener = null;
            if (globalUserStopped) return;
            if (globalAudio && !globalAudio.paused) return;
            const a = ensureAudio();
            a.volume = globalVolume;
            a.currentTime = 0;
            a.play().catch(() => {});
            document.removeEventListener('click', resumeOnInteraction);
            document.removeEventListener('touchstart', resumeOnInteraction);
          };
          cleanupResumeListener();
          globalResumeListener = resumeOnInteraction;
          document.addEventListener('click', resumeOnInteraction, { once: true });
          document.addEventListener('touchstart', resumeOnInteraction, { once: true });
        });
    }
  }, []);

  const toggle = useCallback(() => {
    cleanupResumeListener();
    const audio = ensureAudio();

    if (isPlaying) {
      audio.pause();
      globalUserStopped = true;
      setIsPlaying(false);
    } else {
      audio.volume = globalVolume;
      audio.currentTime = audio.currentTime || 0;
      audio.play().catch(() => {});
      globalUserStopped = false;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    globalVolume = v;
    if (globalAudio) {
      globalAudio.volume = v;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowVolume(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setShowVolume(false), 1500);
  }, []);

  const handleTouchToggleVolume = useCallback(() => {
    setShowVolume(prev => !prev);
  }, []);

  const volumePopover = (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-50 w-36">
      <Volume2 className="w-4 h-4 shrink-0 text-destructive" />
      <Slider
        value={[volume]}
        onValueChange={handleVolumeChange}
        max={1}
        step={0.05}
        className="flex-1"
      />
      <span className="text-xs font-semibold text-foreground min-w-[28px] text-right">{volumePercent}%</span>
    </div>
  );

  if (variant === 'mobile') {
    return (
      <div className="relative flex flex-col items-center" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <button
          onClick={toggle}
          onContextMenu={(e) => { e.preventDefault(); handleTouchToggleVolume(); }}
          onDoubleClick={handleTouchToggleVolume}
          aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc Valentine'}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border-[0.5px] ${
            isPlaying
              ? 'text-white bg-destructive border-destructive'
              : 'text-foreground hover:text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive/40'
          }`}
        >
          <Music
            className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`}
            strokeWidth={1.8}
            style={isPlaying ? { animationDuration: '2s' } : undefined}
          />
          <span className="text-[10px] mt-1 font-medium">Nhạc</span>
        </button>
        {showVolume && (
          <div className="absolute top-full mt-2">
            {volumePopover}
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
        <Music
          className={`w-5 h-5 ${
            isPlaying
              ? 'text-destructive drop-shadow-[0_0_6px_rgba(220,38,38,0.5)] animate-spin'
              : 'text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300'
          }`}
          style={isPlaying ? { animationDuration: '2s' } : undefined}
        />
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
        )}
      </button>
      {showVolume && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2">
          {volumePopover}
        </div>
      )}
    </div>
  );
});

ValentineMusicButton.displayName = 'ValentineMusicButton';
