import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, ChevronLeft, ChevronDown } from 'lucide-react';
import { getTodayVN } from '@/lib/vnTimezone';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewMembersDateDetail } from './NewMembersDateDetail';

interface NewMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GroupedSignup {
  period_label: string;
  new_users: number;
}

type ViewMode = 'day' | 'week' | 'month';

const PAGE_SIZE = 30;

export const NewMembersModal = ({ open, onOpenChange }: NewMembersModalProps) => {
  const { language } = useLanguage();
  const todayVN = getTodayVN();
  const [mode, setMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: signups, isLoading } = useQuery({
    queryKey: ['signups-grouped', mode, limit],
    queryFn: async (): Promise<GroupedSignup[]> => {
      const { data, error } = await supabase.rpc('get_signups_grouped_vn', {
        p_mode: mode,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as GroupedSignup[]) || [];
    },
    enabled: open && !selectedDate,
    staleTime: 5 * 60 * 1000,
  });

  const formatLabel = (label: string) => {
    const [y, m, d] = label.split('-');
    if (mode === 'month') return `${m}/${y}`;
    if (mode === 'week') return `${language === 'vi' ? 'Tuần' : 'Week'} ${d}/${m}/${y}`;
    return `${d}/${m}/${y}`;
  };

  const total = signups?.reduce((s, r) => s + r.new_users, 0) || 0;
  const hasMore = signups?.length === limit;

  const handleRowClick = (row: GroupedSignup) => {
    if (mode === 'day') {
      setSelectedDate(row.period_label);
    }
  };

  const handleBack = () => setSelectedDate(null);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as ViewMode);
    setLimit(PAGE_SIZE);
    setSelectedDate(null);
  };

  const modeLabels = {
    day: language === 'vi' ? 'Ngày' : 'Day',
    week: language === 'vi' ? 'Tuần' : 'Week',
    month: language === 'vi' ? 'Tháng' : 'Month',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-bold text-green-700 dark:text-green-400">
            <Users className="w-5 h-5 text-green-600" />
            {language === 'vi' ? 'Thành viên mới' : 'New Members'}
          </DialogTitle>
        </DialogHeader>

        {selectedDate ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-[15px] text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors mb-2 self-start"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'vi' ? 'Quay lại' : 'Back'}
            </button>
            <NewMembersDateDetail date={selectedDate} />
          </div>
        ) : (
          <>
            <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                {(['day', 'week', 'month'] as ViewMode[]).map(m => (
                  <TabsTrigger key={m} value={m} className="text-xs">
                    {modeLabels[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex-1 overflow-auto rounded-lg border">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : !signups?.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  {language === 'vi' ? 'Chưa có dữ liệu' : 'No data'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-[15px] text-green-700 dark:text-green-400">
                        {modeLabels[mode]}
                      </th>
                      <th className="text-right p-2.5 font-semibold text-[15px] text-green-700 dark:text-green-400">
                        {language === 'vi' ? 'Thành viên mới' : 'New Members'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {signups.map((row) => {
                      const isToday = mode === 'day' && row.period_label === todayVN;
                      const isClickable = mode === 'day';
                      return (
                        <tr
                          key={row.period_label}
                          onClick={() => handleRowClick(row)}
                          className={`border-t transition-colors ${isToday ? 'bg-green-500/10 font-semibold' : 'hover:bg-muted/30'} ${isClickable ? 'cursor-pointer' : ''}`}
                        >
                          <td className="p-2.5 flex items-center gap-1 text-[15px] text-green-700 dark:text-green-400">
                            {formatLabel(row.period_label)}
                            {isToday && (
                              <span className="ml-1 text-[11px] uppercase text-green-600 dark:text-green-300 font-bold">
                                {language === 'vi' ? 'Hôm nay' : 'Today'}
                              </span>
                            )}
                            {isClickable && (
                              <ChevronDown className="w-3.5 h-3.5 text-green-600 dark:text-green-400 ml-auto rotate-[-90deg]" />
                            )}
                          </td>
                          <td className="p-2.5 text-right tabular-nums font-bold text-[15px] text-green-700 dark:text-green-400">
                            +{row.new_users}
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
                className="w-full text-center text-sm text-primary hover:underline py-1"
              >
                {language === 'vi' ? 'Xem thêm...' : 'Load more...'}
              </button>
            )}

            <div className="text-center text-[15px] font-semibold pt-1 text-green-700 dark:text-green-400">
              {language === 'vi' ? 'Tổng' : 'Total'}: <span className="font-bold">{total}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
