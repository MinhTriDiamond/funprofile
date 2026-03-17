import { memo, useState, useCallback } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface GiftHistoryCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dateCounts: Record<string, number>;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function generateLast7Days(): { date: string; day: number; dayName: string }[] {
  const days: { date: string; day: number; dayName: string }[] = [];
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  for (let i = 0; i < 7; i++) {
    const d = new Date(vnNow);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = d.getUTCDay();
    days.push({ date: dateStr, day: d.getUTCDate(), dayName: DAY_NAMES[dayOfWeek] });
  }
  return days.reverse();
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
  const days = generateLast7Days();
  const todayStr = days[days.length - 1]?.date;

  const handleSelect = useCallback((date: string) => {
    onSelectDate(date);
    setOpen(false);
  }, [onSelectDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-base font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          <Calendar className="w-5 h-5 text-pink-600" />
          <span className="text-pink-600 text-base">Lịch sử 7 ngày</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="w-auto p-4"
      >
        <div className="text-sm font-bold text-muted-foreground mb-3">
          Chi tiết giao dịch các ngày trong tuần
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map(({ date, day, dayName }) => {
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            const count = dateCounts[date] || 0;

            return (
              <button
                key={date}
                onClick={() => handleSelect(date)}
                className={`
                  flex flex-col items-center justify-center rounded-lg py-2 px-3 text-sm transition-all
                  ${isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40 font-semibold'
                    : isToday
                      ? 'ring-1 ring-border text-foreground hover:bg-muted/60'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }
                `}
              >
                <span className={`text-base font-bold leading-none ${isSelected ? 'text-emerald-400' : ''}`}>
                  {day}
                </span>
                <span className="text-xs leading-none mt-1">{dayName}</span>
                <span className={`text-sm font-bold leading-none mt-1 ${
                  count > 0
                    ? 'text-pink-600'
                    : 'text-muted-foreground'
                }`}>
                  {count}
                </span>
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
