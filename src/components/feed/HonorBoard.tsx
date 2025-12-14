import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  total_reward: number;
}

export const HonorBoard = () => {
  const navigate = useNavigate();
  const [topRewards, setTopRewards] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchLeaderboards = async () => {
      try {
        // Fetch all data in parallel - NO loops
        const [profilesResult, postsResult, friendshipsResult] = await Promise.all([
          supabase.from('profiles').select('id, username, avatar_url').limit(50),
          supabase.from('posts').select('user_id'),
          supabase.from('friendships').select('user_id, friend_id').eq('status', 'accepted'),
        ]);

        if (!mounted || !profilesResult.data) {
          if (mounted) setLoading(false);
          return;
        }

        // Count posts per user using Map
        const postsCounts = new Map<string, number>();
        (postsResult.data || []).forEach(p => {
          postsCounts.set(p.user_id, (postsCounts.get(p.user_id) || 0) + 1);
        });

        // Count friends per user
        const friendsCounts = new Map<string, number>();
        (friendshipsResult.data || []).forEach(f => {
          friendsCounts.set(f.user_id, (friendsCounts.get(f.user_id) || 0) + 1);
          friendsCounts.set(f.friend_id, (friendsCounts.get(f.friend_id) || 0) + 1);
        });

        // Calculate rewards for each user - NO additional queries
        const usersWithRewards: LeaderboardUser[] = profilesResult.data.map(profile => {
          const postsCount = postsCounts.get(profile.id) || 0;
          const friendsCount = friendsCounts.get(profile.id) || 0;
          const totalReward = 50000 + (postsCount * 10000) + (friendsCount * 50000);

          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url || '',
            total_reward: totalReward,
          };
        });

        // Sort and get top 5
        const sorted = usersWithRewards
          .sort((a, b) => b.total_reward - a.total_reward)
          .slice(0, 5);

        if (mounted) setTopRewards(sorted);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLeaderboards();
    return () => { mounted = false; };
  }, []);

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-yellow-400/50 bg-card p-4 space-y-3">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-6 w-32 mx-auto" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const UserRow = ({ user, rank }: { user: LeaderboardUser; rank: number }) => (
    <div 
      onClick={() => handleUserClick(user.id)}
      className="relative border-2 border-yellow-400/50 rounded-lg p-2 bg-card hover:bg-secondary transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-500 font-bold text-lg w-6">{rank}</span>
          <Avatar className="w-6 h-6 border-2 border-yellow-400/50">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xs bg-yellow-100 text-primary">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-primary text-sm font-medium">{user.username}</span>
        </div>
        <span className="text-yellow-500 font-bold text-sm">{user.total_reward.toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );

  return (
    <div 
      className="sticky top-20 rounded-2xl overflow-hidden border-2 border-yellow-400/50 bg-card"
      style={{ contain: 'layout style paint' }}
    >
      <div className="relative p-3 space-y-2">
        {/* Header */}
        <div className="text-center space-y-1">
          <img 
            src="/fun-profile-logo-small.webp" 
            alt="Fun Profile"
            width={48}
            height={48}
            className="w-12 h-12 mx-auto rounded-full border border-yellow-400 shadow-lg"
            loading="eager"
          />
          
          <h1 className="text-yellow-500 text-xl font-black tracking-wider">
            HONOR BOARD
          </h1>
          <p className="text-yellow-500/80 text-xs font-medium">TOP 5 TOTAL REWARD</p>
        </div>

        {/* Top 5 Users */}
        <div className="space-y-2">
          {topRewards.map((user, index) => (
            <UserRow key={user.id} user={user} rank={index + 1} />
          ))}
          {topRewards.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* View All Button */}
        <Button
          onClick={() => navigate('/leaderboard')}
          className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-lg transition-all group"
        >
          Xem bảng xếp hạng đầy đủ
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};