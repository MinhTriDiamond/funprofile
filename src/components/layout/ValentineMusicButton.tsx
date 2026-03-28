import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Music, Volume2, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TRACK_LIST = [
  { id: 'light-economy-anthem', label: '🌟 Light Economy Anthem', file: '/sounds/light-economy-anthem.mp3' },
  { id: 'valentine', label: '💕 Nhạc Valentine', file: '/sounds/valentine.mp3' },
  { id: 'tet', label: '🧧 Nhạc Tết', file: '/sounds/tet.mp3' },
  { id: 'rich-1', label: '💰 Rich Rich Rich (1)', file: '/sounds/rich-1.mp3' },
  { id: 'rich-2', label: '💰 Rich Rich Rich (2)', file: '/sounds/rich-2.mp3' },
  { id: 'rich-3', label: '💰 Rich Rich Rich (3)', file: '/sounds/rich-3.mp3' },
];

interface ValentineMusicButtonProps {
  variant?: 'desktop' | 'mobile';
}

export const ValentineMusicButton = memo(({ variant = 'desktop' }: ValentineMusicButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTrackId, setCurrentTrackId] = useState('light-economy-anthem');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = TRACK_LIST.find(t => t.id === currentTrackId) || TRACK_LIST[0];

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const playTrack = useCallback((trackFile: string) => {
    // Stop existing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(trackFile);
    audio.volume = volume;
    audio.loop = true;
    audio.addEventListener('error', () => {
      setIsPlaying(false);
      audioRef.current = null;
    });
    audioRef.current = audio;
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }, [volume]);

  const toggle = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    } else {
      playTrack(currentTrack.file);
    }
  }, [isPlaying, playTrack, currentTrack.file]);

  const selectTrack = useCallback((trackId: string) => {
    const track = TRACK_LIST.find(t => t.id === trackId);
    if (!track) return;
    setCurrentTrackId(trackId);
    setPopoverOpen(false);
    // If currently playing, switch immediately
    if (isPlaying || audioRef.current) {
      playTrack(track.file);
    }
  }, [isPlaying, playTrack]);

  const handleVolumeChange = useCallback((val: number[]) => {
    setVolume(val[0]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const volumePercent = Math.round(volume * 100);

  if (variant === 'mobile') {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => {
              // Single tap = toggle play, long press or popover for track list
              if (!popoverOpen) {
                e.preventDefault();
                toggle();
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              setPopoverOpen(true);
            }}
            aria-label={isPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
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
        </PopoverTrigger>
        <PopoverContent side="top" className="w-64 p-3" align="center">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 shrink-0 text-destructive" />
              <Slider value={[volume]} onValueChange={handleVolumeChange} max={1} step={0.05} className="flex-1" />
              <span className="text-xs font-semibold text-foreground min-w-[28px] text-right">{volumePercent}%</span>
            </div>
            <div className="border-t border-border pt-2">
              <p className="text-xs text-muted-foreground mb-2">Chọn bài hát:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {TRACK_LIST.map(track => (
                  <button
                    key={track.id}
                    onClick={() => selectTrack(track.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                      currentTrackId === track.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop variant
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggle}
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
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          )}
        </button>
        <PopoverTrigger asChild>
          <button className="p-0.5 hover:bg-accent rounded transition-colors" aria-label="Chọn bài hát">
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent side="bottom" className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0 text-destructive" />
            <Slider value={[volume]} onValueChange={handleVolumeChange} max={1} step={0.05} className="flex-1" />
            <span className="text-xs font-semibold text-foreground min-w-[28px] text-right">{volumePercent}%</span>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xs text-muted-foreground mb-2">Chọn bài hát:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {TRACK_LIST.map(track => (
                <button
                  key={track.id}
                  onClick={() => selectTrack(track.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    currentTrackId === track.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ValentineMusicButton.displayName = 'ValentineMusicButton';
