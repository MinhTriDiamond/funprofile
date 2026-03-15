import { memo, useState, useCallback } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GiftHistoryCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dateCounts: Record<string, number>;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function generateLast30Days(): { date: string; day: number; dayName: string }[] {
  const days: { date: string; day: number; dayName: string }[] = [];
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const d = new Date(vnNow);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = d.getUTCDay();
    days.push({ date: dateStr, day: d.getUTCDate(), dayName: DAY_NAMES[dayOfWeek] });
  }
  return days;
}

function getCurrentVNMonth(): number {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.getUTCMonth() + 1;
}

const GiftHistoryCalendarComponent = ({
  selectedDate,
  onSelectDate,
  dateCounts,
}: GiftHistoryCalendarProps) => {
  const [open, setOpen] = useState(false);
  const days = generateLast30Days();
  const todayStr = days[0]?.date;
  const month = getCurrentVNMonth();

  const handleSelect = useCallback((date: string) => {
    onSelectDate(date);
    setOpen(false);
  }, [onSelectDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Calendar className="w-3.5 h-3.5" />
          <span>Lịch sử T{month}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-[320px] p-3"
      >
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          30 ngày gần nhất
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, day, dayName }) => {
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            const count = dateCounts[date] || 0;

            return (
              <button
                key={date}
                onClick={() => handleSelect(date)}
                className={`
                  flex flex-col items-center justify-center rounded-lg py-1.5 px-0.5 text-xs transition-all
                  ${isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40 font-semibold'
                    : isToday
                      ? 'ring-1 ring-border text-foreground hover:bg-muted/60'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }
                `}
              >
                <span className={`text-[11px] font-bold leading-none ${isSelected ? 'text-emerald-400' : ''}`}>
                  {day}
                </span>
                <span className="text-[9px] leading-none mt-0.5">{dayName}</span>
                {count > 0 ? (
                  <span className={`text-[9px] leading-none mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-emerald-500'}`}>
                    {count}🎁
                  </span>
                ) : (
                  <span className="text-[9px] leading-none mt-0.5 opacity-30">—</span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const GiftHistoryCalendar = memo(GiftHistoryCalendarComponent);
GiftHistoryCalendar.displayName = 'GiftHistoryCalendar';
