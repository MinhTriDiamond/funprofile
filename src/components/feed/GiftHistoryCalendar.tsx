import { memo } from 'react';

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
  return days;
}

const GiftHistoryCalendarComponent = ({
  selectedDate,
  onSelectDate,
  dateCounts,
}: GiftHistoryCalendarProps) => {
  const days = generateLast7Days();
  const todayStr = days[0]?.date;

  return (
    <div className="px-3 py-2 border-b border-border/30">
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, day, dayName }) => {
          const isSelected = date === selectedDate;
          const count = dateCounts[date] || 0;
          const isToday = date === todayStr;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`
                flex flex-col items-center justify-center py-1.5 rounded-lg text-xs transition-all
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
              {count > 0 && (
                <span className={`text-[9px] leading-none mt-0.5 font-medium ${isSelected ? 'text-emerald-400' : 'text-emerald-500/80'}`}>
                  {count} lệnh
                </span>
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
