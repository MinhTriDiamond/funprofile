import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Search, ShieldBan } from 'lucide-react';
import camlyLogo from '@/assets/tokens/camly-logo.webp';

interface RewardBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberReward {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  total_earned: number;
  total_claimed: number;
  remaining: number;
}

export const RewardBreakdownModal = ({ open, onOpenChange }: RewardBreakdownModalProps) => {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');

  const { data: members, isLoading } = useQuery({
    queryKey: ['member-reward-breakdown'],
    queryFn: async (): Promise<MemberReward[]> => {
      const { data, error } = await supabase.rpc('get_member_reward_breakdown');
      if (error) throw error;
      return (data || []).map((d: any) => ({
        user_id: d.user_id,
        username: d.username || 'unknown',
        full_name: d.full_name,
        avatar_url: d.avatar_url,
        is_banned: d.is_banned,
        total_earned: Number(d.total_earned) || 0,
        total_claimed: Number(d.total_claimed) || 0,
        remaining: Number(d.remaining) || 0,
      }));
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!members?.length) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.username.toLowerCase().includes(q) ||
      (m.full_name && m.full_name.toLowerCase().includes(q))
    );
  }, [members, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, m) => ({
        earned: acc.earned + m.total_earned,
        claimed: acc.claimed + m.total_claimed,
        remaining: acc.remaining + m.remaining,
      }),
      { earned: 0, claimed: 0, remaining: 0 }
    );
  }, [filtered]);

  const fmt = (n: number) => n.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');

  const handleUserClick = (m: MemberReward) => {
    if (m.username && m.username !== 'unknown') {
      window.open(`/profile/${m.username}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center uppercase bg-gradient-to-r from-[#1B5E20] via-[#2E7D32] to-[#1B5E20] bg-clip-text text-transparent drop-shadow-md">
            {language === 'vi' ? 'CHI TIẾT PHẦN THƯỞNG THÀNH VIÊN' : 'MEMBER REWARD BREAKDOWN'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'vi' ? 'Tìm theo username hoặc họ tên...' : 'Search by username or name...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {language === 'vi' ? 'Không có dữ liệu' : 'No data'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 w-10">#</th>
                  <th className="text-left p-2">{language === 'vi' ? 'Thành viên' : 'Member'}</th>
                  <th className="text-left p-2 whitespace-nowrap">{language === 'vi' ? 'Họ tên' : 'Full Name'}</th>
                  <th className="text-right p-2 whitespace-nowrap">{language === 'vi' ? 'Tổng nhận' : 'Total Earned'}</th>
                  <th className="text-right p-2 whitespace-nowrap">{language === 'vi' ? 'Đã claim' : 'Claimed'}</th>
                  <th className="text-right p-2 whitespace-nowrap">{language === 'vi' ? 'Còn lại' : 'Remaining'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.user_id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => handleUserClick(m)}
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {m.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[150px] group-hover:underline group-hover:text-[#2E7D32]">
                          {m.username}
                        </span>
                        {m.is_banned && (
                          <ShieldBan className="w-3.5 h-3.5 text-destructive shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground truncate max-w-[160px]">{m.full_name || '—'}</td>
                    <td className="p-2 text-right font-bold text-[#FFD700]">
                      <span className="flex items-center justify-end gap-1">
                        {fmt(m.total_earned)}
                        <img src={camlyLogo} alt="CAMLY" className="w-4 h-4" />
                      </span>
                    </td>
                    <td className="p-2 text-right font-semibold text-emerald-500">{fmt(m.total_claimed)}</td>
                    <td className="p-2 text-right font-semibold text-orange-400">{fmt(m.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer totals */}
        <div className="text-sm font-bold text-center pt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>{filtered.length} {language === 'vi' ? 'thành viên' : 'members'}</span>
          <span className="flex items-center gap-1 text-[#FFD700]">
            {language === 'vi' ? 'Tổng nhận' : 'Earned'}: {fmt(totals.earned)}
            <img src={camlyLogo} alt="CAMLY" className="w-4 h-4" />
          </span>
          <span className="text-emerald-500">
            {language === 'vi' ? 'Đã claim' : 'Claimed'}: {fmt(totals.claimed)}
          </span>
          <span className="text-orange-400">
            {language === 'vi' ? 'Còn lại' : 'Remaining'}: {fmt(totals.remaining)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
