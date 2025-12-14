import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MoreHorizontal, Video, Pencil, Trophy, ChevronRight } from 'lucide-react';

interface TopUser {
  id: string;
  username: string;
  avatar_url: string | null;
  total_reward: number;
}

export const FacebookRightSidebar = () => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineContacts, setOnlineContacts] = useState<any[]>([]);

  useEffect(() => {
    fetchTopUsers();
    fetchContacts();
  }, []);

  const fetchTopUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      if (!profiles) return;

      const usersWithRewards = await Promise.all(
        profiles.map(async (profile) => {
          const { data: posts } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', profile.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          const { count: friendsCount } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
            .eq('status', 'accepted');

          const { count: sharedCount } = await supabase
            .from('shared_posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          let totalReward = 50000;
          const postsCount = posts?.length || 0;
          totalReward += postsCount * 10000;
          totalReward += (commentsCount || 0) * 5000;
          totalReward += (friendsCount || 0) * 50000;
          totalReward += (sharedCount || 0) * 20000;

          if (posts && posts.length > 0) {
            for (const post of posts) {
              const { count: postReactionsCount } = await supabase
                .from('reactions')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const reactionsOnPost = postReactionsCount || 0;
              if (reactionsOnPost >= 3) {
                totalReward += 30000 + (reactionsOnPost - 3) * 1000;
              }
            }
          }

          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            total_reward: totalReward,
          };
        })
      );

      const sorted = usersWithRewards
        .sort((a, b) => b.total_reward - a.total_reward)
        .slice(0, 10);

      setTopUsers(sorted);
    } catch (error) {
      console.error('Error fetching top users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
      .eq('status', 'accepted')
      .limit(10);

    if (friendships) {
      const friendIds = friendships.map(f => 
        f.user_id === session.user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds);

      setOnlineContacts(profiles || []);
    }
  };

  return (
    <div className="space-y-4">
      {/* Honor Board */}
      <div className="fb-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-lg">Honor Board</h3>
          </div>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-primary hover:underline text-sm font-semibold"
          >
            Xem tất cả
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {topUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => navigate(`/profile/${user.id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <span className={`w-6 text-center font-bold ${
                  index === 0 ? 'text-gold' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-amber-600' :
                  'text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm truncate">{user.username}</p>
                </div>
                <span className="text-gold font-semibold text-sm">
                  {user.total_reward.toLocaleString('vi-VN')}
                </span>
              </button>
            ))}
          </div>
        )}

        <Button
          onClick={() => navigate('/leaderboard')}
          variant="secondary"
          className="w-full mt-4"
        >
          Xem bảng xếp hạng đầy đủ
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Sponsored */}
      <div className="fb-card p-4">
        <h3 className="font-semibold text-muted-foreground mb-3">Được tài trợ</h3>
        <div className="flex gap-3 cursor-pointer hover:bg-secondary rounded-lg p-2 -m-2 transition-colors">
          <img
            src="/fun-profile-logo-thumb-optimized.webp"
            alt="Ad"
            width={128}
            height={128}
            loading="lazy"
            className="w-32 h-32 rounded-lg object-cover"
          />
          <div>
            <p className="font-semibold text-sm">FUN Profile - Mạng xã hội Web3</p>
            <p className="text-xs text-muted-foreground">funprofile.io</p>
          </div>
        </div>
      </div>

      {/* Contacts */}
      {onlineContacts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="font-semibold text-muted-foreground">Người liên hệ</h3>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                <Video className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                <Search className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {onlineContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => navigate(`/profile/${contact.id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={contact.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {contact.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <span className="font-medium text-sm">{contact.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Birthdays */}
      <div className="fb-card p-4">
        <h3 className="font-semibold text-muted-foreground mb-3">Sinh nhật</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            🎂
          </div>
          <p className="text-sm">
            <span className="font-semibold">Không có sinh nhật</span> hôm nay
          </p>
        </div>
      </div>
    </div>
  );
};
