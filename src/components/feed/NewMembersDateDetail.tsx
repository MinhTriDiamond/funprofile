import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';

interface SocialLink {
  platform?: string;
  url?: string;
  label?: string;
}

interface SignupUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  social_links: SocialLink[] | null;
}

interface Props {
  date: string;
}

const getPlatformEmoji = (platform?: string): string => {
  const p = (platform || '').toLowerCase();
  if (p.includes('facebook') || p.includes('fb')) return '📘';
  if (p.includes('youtube') || p.includes('yt')) return '▶️';
  if (p.includes('tiktok')) return '🎵';
  if (p.includes('instagram') || p.includes('ig')) return '📷';
  if (p.includes('twitter') || p.includes('x.com')) return '🐦';
  if (p.includes('telegram') || p.includes('tg')) return '✈️';
  if (p.includes('zalo')) return '💬';
  if (p.includes('linkedin')) return '💼';
  if (p.includes('github')) return '🐙';
  if (p.includes('website') || p.includes('blog')) return '🌐';
  return '🔗';
};

const getPlatformName = (link: SocialLink): string => {
  if (link.label) return link.label;
  if (link.platform) return link.platform;
  try {
    if (link.url) return new URL(link.url).hostname.replace('www.', '');
  } catch {}
  return 'Link';
};

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

  const parseSocialLinks = (raw: SocialLink[] | null): SocialLink[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(l => l.url);
    return [];
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="text-center text-[15px] font-semibold mb-2 text-green-700 dark:text-green-400">
        {formattedDate} — {users?.length || 0} {language === 'vi' ? 'thành viên mới' : 'new members'}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
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
            const links = parseSocialLinks(user.social_links);
            const linkCount = links.length;

            return (
              <div key={user.id} className="rounded-lg hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => navigate(user.username ? `/@${user.username}` : `/profile/${user.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 text-left"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user.avatar_url || ''} sizeHint="sm" />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate text-green-700 dark:text-green-400">{displayName}</div>
                    {user.username && (
                      <div className="text-[13px] text-green-600/70 dark:text-green-400/70 truncate">@{user.username}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {linkCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[13px] text-green-600 dark:text-green-400">
                        <Link2 className="w-3.5 h-3.5" />
                        {linkCount}
                      </span>
                    )}
                    <span className="text-[13px] text-green-600/70 dark:text-green-400/70 tabular-nums">
                      {formatTime(user.created_at)}
                    </span>
                  </div>
                </button>

                {linkCount > 0 && (
                  <div className="px-2.5 pb-2 pl-[3.25rem] flex flex-wrap gap-1">
                    {links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors"
                      >
                        <span>{getPlatformEmoji(link.platform)}</span>
                        <span className="truncate max-w-[100px]">{getPlatformName(link)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
