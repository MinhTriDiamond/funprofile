import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight } from 'lucide-react';

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
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchTopUsers = async () => {
      try {
        // Fetch profiles with counts in optimized queries
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .limit(50);

        if (profileError || !profiles || !mounted) {
          if (mounted) setLoading(false);
          return;
        }

        // Calculate rewards based on simple counts (optimized)
        const usersWithRewards: TopUser[] = [];

        for (const profile of profiles.slice(0, 20)) {
          // Get post count
          const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get friends count
          const { count: friendsCount } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
            .eq('status', 'accepted');

          // Simple reward calculation
          let totalReward = 50000; // Base reward
          totalReward += (postsCount || 0) * 10000;
          totalReward += (friendsCount || 0) * 50000;

          usersWithRewards.push({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            total_reward: totalReward,
          });
        }

        if (mounted) {
          const sorted = usersWithRewards
            .sort((a, b) => b.total_reward - a.total_reward)
            .slice(0, 10);
          setTopUsers(sorted);
        }
      } catch (err) {
        console.error('Error fetching top users:', err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTopUsers();
    
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-4" style={{ contain: 'layout style' }}>
      {/* Honor Board */}
      <div className="fb-card p-4" style={{ minHeight: '320px', contain: 'layout style' }}>
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
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không thể tải bảng xếp hạng</p>
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Chưa có dữ liệu</p>
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
      <div className="fb-card p-4" style={{ contain: 'layout style' }}>
        <h3 className="font-semibold text-muted-foreground mb-3">Được tài trợ</h3>
        <div className="flex gap-3 cursor-pointer hover:bg-secondary rounded-lg p-2 -m-2 transition-colors">
          <img
            src="/fun-profile-logo-thumb-optimized.webp"
            alt="FUN Profile Ad"
            width={128}
            height={128}
            className="w-32 h-32 rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="font-semibold text-sm">FUN Profile - Mạng xã hội Web3</p>
            <p className="text-xs text-muted-foreground">funprofile.io</p>
          </div>
        </div>
      </div>

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
