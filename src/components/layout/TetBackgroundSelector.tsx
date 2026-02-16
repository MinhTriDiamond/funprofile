import { useState, memo } from 'react';
import { Palette } from 'lucide-react';
import { useTetBackground, TetBgOption } from '@/contexts/TetBackgroundContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const BG_OPTIONS: { label: string; emoji: string }[] = [
  { label: 'Tết 1', emoji: '🏮' },
  { label: 'Tết 2', emoji: '🎋' },
  { label: 'Tết 3', emoji: '🧧' },
  { label: 'Tết 4', emoji: '🎆' },
  { label: 'Tết 5', emoji: '🐉' },
  { label: 'Tết 6', emoji: '🌸' },
];

interface TetBackgroundSelectorProps {
  variant?: 'desktop' | 'mobile';
}

export const TetBackgroundSelector = memo(({ variant = 'desktop' }: TetBackgroundSelectorProps) => {
  const { selectedBg, setSelectedBg } = useTetBackground();
  const [open, setOpen] = useState(false);

  if (variant === 'mobile') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Chọn nền Tết"
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border-[0.5px] text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-[#C9A84C]/40"
          >
            <Palette className="w-6 h-6" strokeWidth={1.8} />
            <span className="text-[10px] mt-1 font-medium">Nền</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-auto p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {BG_OPTIONS.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedBg(idx as TetBgOption); setOpen(false); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedBg === idx
                    ? 'bg-primary/15 ring-2 ring-primary text-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Chọn nền Tết"
          className="fun-icon-btn-gold group relative"
        >
          <Palette className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {BG_OPTIONS.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => { setSelectedBg(idx as TetBgOption); setOpen(false); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedBg === idx
                  ? 'bg-primary/15 ring-2 ring-primary text-primary'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

TetBackgroundSelector.displayName = 'TetBackgroundSelector';
