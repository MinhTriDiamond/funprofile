import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { getTodayVN } from '@/lib/vnTimezone';
import { formatNumber } from '@/lib/formatters';
import { LucideIcon, ArrowLeft, Filter } from 'lucide-react';
import { ContentStatsDateDetail } from './ContentStatsDateDetail';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import camlyLogo from '@/assets/tokens/camly-logo.webp';

export type ContentStatsType = 'posts' | 'photos' | 'videos' | 'livestreams' | 'rewards';

interface ContentStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ContentStatsType;
  title: string;
  icon: LucideIcon;
  showCamlyLogo?: boolean;
}

interface StatsRow {
  period_label: string;
  count: number;
}

type ViewMode = 'day' | 'week' | 'month';
const PAGE_SIZE = 30;

export const ContentStatsModal = ({ open, onOpenChange, type, title, icon: Icon, showCamlyLogo }: ContentStatsModalProps) => {
  const { language } = useLanguage();
  const todayVN = getTodayVN();
  const [mode, setMode] = useState<ViewMode>('day');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Custom date range
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [customRangeActive, setCustomRangeActive] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['content-stats-grouped', type, mode, limit],
    queryFn: async (): Promise<StatsRow[]> => {
      const { data, error } = await supabase.rpc('get_content_stats_grouped_vn', {
        p_type: type,
        p_mode: mode,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as StatsRow[]) || [];
    },
    enabled: open && !customRangeActive,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch grand total across ALL periods (not just loaded page)
  const { data: allRows } = useQuery({
    queryKey: ['content-stats-grouped-all', type, mode],
    queryFn: async (): Promise<StatsRow[]> => {
      const { data, error } = await supabase.rpc('get_content_stats_grouped_vn', {
        p_type: type,
        p_mode: mode,
        p_limit: 100000,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as StatsRow[]) || [];
    },
    enabled: open && !customRangeActive,
    staleTime: 5 * 60 * 1000,
  });

  const formatLabel = (label: string) => {
    const [y, m, d] = label.split('-');
    if (mode === 'month') return `${m}/${y}`;
    if (mode === 'week') return `${language === 'vi' ? 'Tuần' : 'Week'} ${d}/${m}/${y}`;
    return `${d}/${m}/${y}`;
  };

  const grandTotal = allRows?.reduce((s, r) => s + r.count, 0) || 0;
  const hasMore = rows?.length === limit;

  const handleModeChange = (newMode: string) => {
    setMode(newMode as ViewMode);
    setLimit(PAGE_SIZE);
    setSelectedDate(null);
    setCustomRangeActive(false);
  };

  const handleApplyFilter = () => {
    if (dateFrom && dateTo) {
      setCustomRangeActive(true);
      setSelectedDate(format(dateFrom, 'yyyy-MM-dd'));
      setFilterOpen(false);
    }
  };

  const handleClearFilter = () => {
    setCustomRangeActive(false);
    setSelectedDate(null);
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterOpen(false);
  };

  const modeLabels = {
    day: language === 'vi' ? 'Ngày' : 'Day',
    week: language === 'vi' ? 'Tuần' : 'Week',
    month: language === 'vi' ? 'Tháng' : 'Month',
  };

  const valueLabel = type === 'rewards'
    ? (language === 'vi' ? 'Số lượng' : 'Amount')
    : (language === 'vi' ? 'Số lượng' : 'Count');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[792px] max-w-[95vw] sm:max-w-[792px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-bold text-green-800 dark:text-green-300">
            {selectedDate ? (
              <button
                onClick={() => { setSelectedDate(null); setCustomRangeActive(false); }}
                className="flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
                <Icon className="w-5 h-5 text-green-700" />
                {title}
              </button>
            ) : (
              <>
                <Icon className="w-5 h-5 text-green-700" />
                {title}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedDate && (
          <div className="flex items-center gap-2">
            <Tabs value={mode} onValueChange={handleModeChange} className="flex-1">
              <TabsList className="w-full grid grid-cols-3">
                {(['day', 'week', 'month'] as ViewMode[]).map(m => (
                  <TabsTrigger key={m} value={m} className="text-[15px]">
                    {modeLabels[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={customRangeActive ? 'default' : 'outline'}
                  size="icon"
                  className="shrink-0 h-9 w-9"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 space-y-3" align="end">
                <p className="text-sm font-semibold text-foreground">
                  {language === 'vi' ? 'Chọn khoảng thời gian' : 'Select date range'}
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'vi' ? 'Từ ngày' : 'From'}</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      disabled={(d) => d > new Date()}
                      className={cn("p-2 pointer-events-auto border rounded-md")}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'vi' ? 'Đến ngày' : 'To'}</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)}
                      className={cn("p-2 pointer-events-auto border rounded-md")}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleApplyFilter} disabled={!dateFrom || !dateTo} className="flex-1">
                    {language === 'vi' ? 'Áp dụng' : 'Apply'}
                  </Button>
                  {customRangeActive && (
                    <Button size="sm" variant="outline" onClick={handleClearFilter}>
                      {language === 'vi' ? 'Xóa' : 'Clear'}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {selectedDate ? (
          <ContentStatsDateDetail
            date={selectedDate}
            mode={customRangeActive ? 'custom' : mode}
            type={type}
            showCamlyLogo={showCamlyLogo}
            dateFrom={customRangeActive && dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined}
            dateTo={customRangeActive && dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined}
          />
        ) : (
          <>
            <div className="flex-1 overflow-auto rounded-lg border">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : !rows?.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  {language === 'vi' ? 'Chưa có dữ liệu' : 'No data'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-background sticky top-0 z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-[15px] text-green-800 dark:text-green-300">
                        {modeLabels[mode]}
                      </th>
                      <th className="text-right p-2.5 font-semibold text-[15px] text-green-800 dark:text-green-300">
                        {valueLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isToday = mode === 'day' && row.period_label === todayVN;
                      return (
                        <tr
                          key={row.period_label}
                          className={`border-t transition-colors cursor-pointer ${isToday ? 'bg-green-500/10 font-semibold' : 'hover:bg-muted/30'}`}
                          onClick={() => setSelectedDate(row.period_label)}
                        >
                          <td className="p-2.5 text-[15px] text-green-800 dark:text-green-300">
                            {formatLabel(row.period_label)}
                            {isToday && (
                              <span className="ml-1 text-[11px] uppercase text-green-700 dark:text-green-200 font-bold">
                                {language === 'vi' ? 'Hôm nay' : 'Today'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right tabular-nums font-bold text-[15px] text-green-800 dark:text-green-300">
                            <span className="inline-flex items-center gap-1">
                              {type === 'rewards' ? formatNumber(row.count) : `+${row.count}`}
                              {showCamlyLogo && (
                                <img src={camlyLogo} alt="CAMLY" className="w-4 h-4 inline-block" />
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {hasMore && (
              <button
                onClick={() => setLimit(l => l + PAGE_SIZE)}
                className="w-full text-center text-sm text-primary hover:underline py-0.5"
              >
                {language === 'vi' ? 'Xem thêm...' : 'Load more...'}
              </button>
            )}

            <div className="text-center text-[15px] font-semibold text-green-800 dark:text-green-300">
              <span className="inline-flex items-center gap-1">
                {language === 'vi' ? 'Tổng' : 'Total'}: <span className="font-bold">{formatNumber(total)}</span>
                {showCamlyLogo && (
                  <img src={camlyLogo} alt="CAMLY" className="w-4 h-4 inline-block" />
                )}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
