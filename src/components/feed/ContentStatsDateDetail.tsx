import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { ContentStatsType } from './ContentStatsModal';
import { formatNumber } from '@/lib/formatters';
import camlyLogo from '@/assets/tokens/camly-logo.webp';

interface SocialLink {
  platform?: string;
  url?: string;
  label?: string;
}

interface UserRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  post_count: number;
  social_links: SocialLink[] | null;
}

interface Props {
  date: string;
  mode: 'day' | 'week' | 'month';
  type: ContentStatsType;
  showCamlyLogo?: boolean;
}

const SIMPLE_ICONS = 'https://cdn.simpleicons.org';

const getPlatformLogo = (platform?: string): string => {
  const p = (platform || '').toLowerCase();
  if (p.includes('facebook') || p.includes('fb')) return `${SIMPLE_ICONS}/facebook/1877F2`;
  if (p.includes('youtube') || p.includes('yt')) return `${SIMPLE_ICONS}/youtube/FF0000`;
  if (p.includes('tiktok')) return `${SIMPLE_ICONS}/tiktok/000000`;
  if (p.includes('instagram') || p.includes('ig')) return `${SIMPLE_ICONS}/instagram/E4405F`;
  if (p.includes('twitter') || p.includes('x.com') || p.includes('x ')) return `${SIMPLE_ICONS}/x/000000`;
  if (p.includes('telegram') || p.includes('tg')) return `${SIMPLE_ICONS}/telegram/26A5E4`;
  if (p.includes('zalo')) return '/zalo-logo-v2.png';
  if (p.includes('linkedin')) return `${SIMPLE_ICONS}/linkedin/0A66C2`;
  if (p.includes('github')) return `${SIMPLE_ICONS}/github/181717`;
  if (p.includes('threads')) return `${SIMPLE_ICONS}/threads/000000`;
  if (p.includes('funplay') || p.includes('fun play')) return '/fun-play-logo-36.webp';
  if (p.includes('angel')) return '/angel-ai-logo-36.webp';
  if (p.includes('website') || p.includes('blog')) return `${SIMPLE_ICONS}/googlechrome/4285F4`;
  return `${SIMPLE_ICONS}/link/gray`;
};

const getPlatformName = (link: SocialLink): string => {
  if (link.label) return link.label;
  if (link.platform) return link.platform;
  try {
    if (link.url) return new URL(link.url).hostname.replace('www.', '');
  } catch {}
  return 'Link';
};

const typeLabels = {
  posts: { vi: 'bài viết', en: 'posts' },
  photos: { vi: 'ảnh', en: 'photos' },
  videos: { vi: 'video', en: 'videos' },
  livestreams: { vi: 'livestream', en: 'livestreams' },
  rewards: { vi: 'CAMLY', en: 'CAMLY' },
};

export const ContentStatsDateDetail = ({ date, mode, type, showCamlyLogo }: Props) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ['content-users-by-period', type, date, mode],
    queryFn: async (): Promise<UserRow[]> => {
      const { data, error } = await supabase.rpc('get_content_users_by_period_vn', {
        p_type: type,
        p_date: date,
        p_mode: mode,
      });
      if (error) throw error;
      return (data as UserRow[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatDateHeader = () => {
    const [y, m, d] = date.split('-');
    if (mode === 'month') return `${m}/${y}`;
    if (mode === 'week') return `${language === 'vi' ? 'Tuần' : 'Week'} ${d}/${m}/${y}`;
    return `${d}/${m}/${y}`;
  };

  const totalCount = users?.reduce((s, u) => s + u.post_count, 0) || 0;
  const label = typeLabels[type][language === 'vi' ? 'vi' : 'en'];

  const parseSocialLinks = (raw: SocialLink[] | null): SocialLink[] => {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.filter(l => l.url);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="text-center text-[15px] font-semibold mb-2 text-green-800 dark:text-green-300">
        {formatDateHeader()} — {totalCount} {label}
        {showCamlyLogo && <img src={camlyLogo} alt="CAMLY" className="w-4 h-4 inline-block ml-1" />}
        {' '}({users?.length || 0} {language === 'vi' ? 'thành viên' : 'members'})
      </div>

      {isLoading ? (
        <div className="space-y-3 p-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !users?.length ? (
        <div className="p-8 text-center text-muted-foreground">
          {language === 'vi' ? 'Không có dữ liệu' : 'No data'}
        </div>
      ) : (
        <div className="space-y-1">
          {users.map((user) => {
            const displayName = user.display_name || user.username || 'User';
            const initials = displayName.slice(0, 2).toUpperCase();
            const links = parseSocialLinks(user.social_links);

            return (
              <div
                key={user.user_id}
                className="rounded-lg hover:bg-muted/50 transition-colors p-2.5 cursor-pointer"
                onClick={() => navigate(user.username ? `/@${user.username}` : `/profile/${user.user_id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-left min-w-0">
                        <div className="text-[15px] font-semibold truncate text-green-800 dark:text-green-300">{displayName}</div>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 shrink-0">
                        {links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={getPlatformName(link)}
                            className="hover:scale-110 transition-transform"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img src={getPlatformLogo(link.platform)} alt={getPlatformName(link)} className="w-[18px] h-[18px] rounded-sm object-contain" />
                          </a>
                        ))}
                        <span className="text-[13px] text-green-700 dark:text-green-300 tabular-nums ml-1 font-bold inline-flex items-center gap-0.5">
                          {type === 'rewards' ? formatNumber(user.post_count) : user.post_count}
                          {showCamlyLogo && <img src={camlyLogo} alt="CAMLY" className="w-3.5 h-3.5 inline-block" />}
                        </span>
                      </div>
                    </div>
                    {user.username && (
                      <div className="text-[13px] text-green-700/70 dark:text-green-300/70 truncate">
                        @{user.username}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
