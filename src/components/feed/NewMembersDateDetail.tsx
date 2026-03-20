import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface SignupUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Props {
  date: string;
}

export const NewMembersDateDetail = ({ date }: Props) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ['signups-by-date', date],
    queryFn: async (): Promise<SignupUser[]> => {
      const { data, error } = await supabase.rpc('get_signups_by_date_vn', { p_date: date });
      if (error) throw error;
      return (data as SignupUser[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [y, m, d] = date.split('-');
  const formattedDate = `${d}/${m}/${y}`;

  const formatTime = (iso: string) => {
    const dt = new Date(iso);
    const vnHour = dt.getUTCHours() + 7;
    const h = vnHour >= 24 ? vnHour - 24 : vnHour;
    const min = String(dt.getUTCMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="text-center text-sm font-semibold mb-2 text-muted-foreground">
        {formattedDate} — {users?.length || 0} {language === 'vi' ? 'thành viên mới' : 'new members'}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : !users?.length ? (
        <div className="p-8 text-center text-muted-foreground">
          {language === 'vi' ? 'Không có thành viên mới' : 'No new members'}
        </div>
      ) : (
        <div className="space-y-1">
          {users.map((user) => {
            const displayName = user.full_name || user.username || 'User';
            const initials = displayName.slice(0, 2).toUpperCase();
            return (
              <button
                key={user.id}
                onClick={() => navigate(user.username ? `/@${user.username}` : `/profile/${user.id}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user.avatar_url || ''} sizeHint="sm" />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  {user.username && (
                    <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(user.created_at)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
