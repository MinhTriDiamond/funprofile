import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users } from 'lucide-react';
import { getTodayVN } from '@/lib/vnTimezone';

interface NewMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DailySignup {
  signup_date: string;
  new_users: number;
}

export const NewMembersModal = ({ open, onOpenChange }: NewMembersModalProps) => {
  const { language } = useLanguage();
  const todayVN = getTodayVN();

  const { data: dailySignups, isLoading } = useQuery({
    queryKey: ['daily-signups'],
    queryFn: async (): Promise<DailySignup[]> => {
      const { data, error } = await supabase.rpc('get_daily_signups_vn', { p_days: 30 });
      if (error) throw error;
      return (data as DailySignup[]) || [];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const total = dailySignups?.reduce((s, r) => s + r.new_users, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg font-bold">
            <Users className="w-5 h-5 text-blue-500" />
            {language === 'vi' ? 'Thành viên mới mỗi ngày' : 'New Members per Day'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-lg border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !dailySignups?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              {language === 'vi' ? 'Chưa có dữ liệu' : 'No data'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2.5 font-semibold">{language === 'vi' ? 'Ngày' : 'Date'}</th>
                  <th className="text-right p-2.5 font-semibold">{language === 'vi' ? 'Thành viên mới' : 'New Members'}</th>
                </tr>
              </thead>
              <tbody>
                {dailySignups.map((row) => {
                  const isToday = row.signup_date === todayVN;
                  return (
                    <tr
                      key={row.signup_date}
                      className={`border-t transition-colors ${isToday ? 'bg-blue-500/10 font-semibold' : 'hover:bg-muted/30'}`}
                    >
                      <td className="p-2.5">
                        {formatDate(row.signup_date)}
                        {isToday && (
                          <span className="ml-2 text-[10px] uppercase text-blue-500 font-bold">
                            {language === 'vi' ? 'Hôm nay' : 'Today'}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-primary">
                        +{row.new_users}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-center text-sm font-semibold pt-1 text-muted-foreground">
          {language === 'vi' ? 'Tổng 30 ngày' : '30-day total'}: <span className="text-primary font-bold">{total}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
