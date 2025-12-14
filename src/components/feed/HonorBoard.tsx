import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, MessageCircle, Star, Users, BadgeDollarSign, ChevronRight } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  friends_count: number;
  total_reward: number;
}

export const HonorBoard = () => {
  const navigate = useNavigate();
  const [topPosts, setTopPosts] = useState<LeaderboardUser[]>([]);
  const [topComments, setTopComments] = useState<LeaderboardUser[]>([]);
  const [topReactions, setTopReactions] = useState<LeaderboardUser[]>([]);
  const [topFriends, setTopFriends] = useState<LeaderboardUser[]>([]);
  const [topRewards, setTopRewards] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      // Fetch all users with their data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      if (!profiles) return;

      // Calculate rewards for each user
      const usersWithRewards = await Promise.all(
        profiles.map(async (profile) => {
          // Fetch posts
          const { data: posts } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', profile.id);

          // Fetch comments count
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Fetch reactions count
          const { count: reactionsCount } = await supabase
            .from('reactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Fetch friends count
          const { count: friendsCount } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
            .eq('status', 'accepted');

          // Fetch shared posts count
          const { count: sharedCount } = await supabase
            .from('shared_posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Calculate total reward
          let totalReward = 50000; // New user bonus
          const postsCount = posts?.length || 0;
          totalReward += postsCount * 10000; // Posts reward
          totalReward += (commentsCount || 0) * 5000; // Comments reward
          totalReward += (friendsCount || 0) * 50000; // Friends reward
          totalReward += (sharedCount || 0) * 20000; // Shared posts reward

          // Reactions on posts reward
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
            posts_count: postsCount,
            comments_count: commentsCount || 0,
            reactions_count: reactionsCount || 0,
            friends_count: friendsCount || 0,
            total_reward: totalReward,
          };
        })
      );

      // Sort by total reward and get top 5
      const topRewardsUsers = usersWithRewards
        .sort((a, b) => b.total_reward - a.total_reward)
        .slice(0, 5);

      setTopRewards(topRewardsUsers);
      setTopPosts([]);
      setTopComments([]);
      setTopReactions([]);
      setTopFriends([]);
    } catch (error) {
      // Error fetching leaderboards - silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const UserRow = ({ user, rank }: { user: LeaderboardUser; rank: number }) => (
    <div 
      onClick={() => handleUserClick(user.id)}
      className="relative border-2 border-gold rounded-lg p-2 bg-white/90 hover:bg-white transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gold font-bold text-lg w-6">{rank}</span>
          <Avatar className="w-6 h-6 border-2 border-gold">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xs bg-gold/20 text-primary">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-primary text-sm font-medium">{user.username}</span>
        </div>
        <span className="text-gold font-bold text-sm">{user.total_reward.toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className="sticky top-20 rounded-2xl overflow-hidden border-2 border-gold bg-white shadow-gold-glow animate-gold-pulse">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-2 left-2 w-1 h-1 bg-gold rounded-full animate-pulse"></div>
        <div className="absolute top-4 right-4 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-4 right-8 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative p-3 space-y-2">
        {/* Header with logo */}
        <div className="text-center space-y-1">
          <div className="inline-block">
            <div className="relative">
              <img 
                src="/fun-profile-logo-40.webp" 
                alt="Fun Profile Web3"
                width={48}
                height={48}
                className="w-12 h-12 mx-auto rounded-full border border-yellow-400 shadow-lg"
              />
            </div>
          </div>
          
          <h1 className="text-gold text-xl font-black tracking-wider drop-shadow-lg">
            HONOR BOARD
          </h1>
          <p className="text-gold text-xs font-medium">TOP 5 TOTAL REWARD</p>
        </div>

        {/* Top 5 Users */}
        <div className="space-y-2">
          {topRewards.map((user, index) => (
            <UserRow key={user.id} user={user} rank={index + 1} />
          ))}
          {topRewards.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No data available yet
            </div>
          )}
        </div>

        {/* View All Button */}
        <Button
          onClick={() => navigate('/leaderboard')}
          className="w-full mt-3 bg-gold hover:bg-gold-glow text-white font-bold shadow-lg transition-all group"
        >
          Xem bảng xếp hạng đầy đủ
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};
