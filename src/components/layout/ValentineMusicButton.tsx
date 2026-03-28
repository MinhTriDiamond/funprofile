import { useState, useEffect, useCallback, memo } from 'react';
import { Music, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as GA from '@/lib/globalAudio';

interface ValentineMusicButtonProps {
  variant?: 'desktop' | 'mobile';
}

export const ValentineMusicButton = memo(({ variant = 'desktop' }: ValentineMusicButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(() => GA.getState().playing);
  const [volume, setVolume] = useState(() => GA.getState().volume);

  useEffect(() => {
    return GA.subscribe(() => {
      const s = GA.getState();
      setIsPlaying(s.playing);
      setVolume(s.volume);
    });
  }, []);

  const toggle = useCallback(() => GA.toggle(), []);
  const handleVolumeChange = useCallback((val: number[]) => GA.setVolume(val[0]), []);

  const volumePercent = Math.round(volume * 100);

  if (variant === 'mobile') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => { e.preventDefault(); toggle(); }}
            aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border-[0.5px] ${
              isPlaying
                ? 'text-white bg-destructive border-destructive'
                : 'text-foreground hover:text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive/40'
            }`}
          >
            <Music className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`} strokeWidth={1.8} style={isPlaying ? { animationDuration: '2s' } : undefined} />
            <span className="text-[10px] mt-1 font-medium">Nhạc</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-56 p-3" align="center">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0 text-destructive" />
            <Slider value={[volume]} onValueChange={handleVolumeChange} max={1} step={0.05} className="flex-1" />
            <span className="text-xs font-semibold text-foreground min-w-[28px] text-right">{volumePercent}%</span>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); toggle(); }}
          aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
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
          {isPlaying && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-56 p-3" align="end">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 shrink-0 text-destructive" />
          <Slider value={[volume]} onValueChange={handleVolumeChange} max={1} step={0.05} className="flex-1" />
          <span className="text-xs font-semibold text-foreground min-w-[28px] text-right">{volumePercent}%</span>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ValentineMusicButton.displayName = 'ValentineMusicButton';
