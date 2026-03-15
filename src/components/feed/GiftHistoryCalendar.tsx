import { memo, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface GiftHistoryCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  dateCounts: Record<string, number>; // YYYY-MM-DD → count
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function generateLast30Days(): { date: string; day: number; dayName: string }[] {
  const days: { date: string; day: number; dayName: string }[] = [];
  const now = new Date();
  // Use VN timezone offset (UTC+7)
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const d = new Date(vnNow);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = d.getUTCDay(); // 0=Sun
    days.push({ date: dateStr, day: d.getUTCDate(), dayName: DAY_NAMES[dayOfWeek] });
  }
  return days;
}

const GiftHistoryCalendarComponent = ({
  selectedDate,
  onSelectDate,
  dateCounts,
}: GiftHistoryCalendarProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = generateLast30Days();

  // Scroll selected into view on mount
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  const todayStr = days[0]?.date;

  return (
    <div className="px-3 py-2 border-b border-border/30">
      <div className="flex items-center gap-1.5 mb-2">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Lịch sử 30 ngày</span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map(({ date, day, dayName }) => {
          const isSelected = date === selectedDate;
          const hasGifts = (dateCounts[date] || 0) > 0;
          const isToday = date === todayStr;

          return (
            <button
              key={date}
              data-selected={isSelected}
              onClick={() => onSelectDate(date)}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center w-10 h-12 rounded-lg text-xs transition-all relative
                ${isSelected
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40 font-semibold'
                  : 'hover:bg-muted/60 text-muted-foreground'
                }
              `}
            >
              <span className={`text-[11px] font-bold leading-none ${isSelected ? 'text-emerald-400' : 'text-foreground'}`}>
                {day}
              </span>
              <span className="text-[9px] leading-none mt-0.5">
                {isToday ? 'Nay' : dayName}
              </span>
              {hasGifts && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500/60'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const GiftHistoryCalendar = memo(GiftHistoryCalendarComponent);
GiftHistoryCalendar.displayName = 'GiftHistoryCalendar';
