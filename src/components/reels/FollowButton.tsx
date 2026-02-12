import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';

interface FollowButtonProps {
  userId: string;
}

export const FollowButton = ({ userId }: FollowButtonProps) => {
  const { t } = useLanguage();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-follow'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', userId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser || currentUser.id === userId) return null;
      const { data } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`)
        .eq('status', 'accepted')
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentUser && currentUser.id !== userId,
  });

  if (!currentUser || currentUser.id === userId || isFollowing === null) return null;

  if (isFollowing) {
    return (
      <span className="text-white/70 text-xs border border-white/30 px-3 py-1 rounded-full">
        {t('reelFollowing')}
      </span>
    );
  }

  return (
    <button className="text-white text-xs font-semibold border border-white px-3 py-1 rounded-full hover:bg-white/20 transition-colors">
      {t('reelFollow')}
    </button>
  );
};
