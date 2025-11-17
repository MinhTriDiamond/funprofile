import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Users, BadgeDollarSign } from 'lucide-react';

interface UserStats {
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  friends_count: number;
  total_reward: number;
}

interface ProfileHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const ProfileHonorBoard = ({ userId, username, avatarUrl }: ProfileHonorBoardProps) => {
  const [stats, setStats] = useState<UserStats>({
    posts_count: 0,
    comments_count: 0,
    reactions_count: 0,
    friends_count: 0,
    total_reward: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      // Fetch posts with their reactions count
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch reactions count (reactions this user made)
      const { count: reactionsCount } = await supabase
        .from('reactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch friends count (accepted friendships)
      const { count: friendsCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      // Fetch shared posts count (posts that were shared by others)
      const { count: sharedCount } = await supabase
        .from('shared_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Calculate rewards
      let totalReward = 50000; // New user bonus

      // Posts reward: 10,000 per post
      const postsCount = posts?.length || 0;
      totalReward += postsCount * 10000;

      // Comments reward: 5,000 per comment
      totalReward += (commentsCount || 0) * 5000;

      // Friends reward: 50,000 per friend
      totalReward += (friendsCount || 0) * 50000;

      // Shared posts reward: 20,000 per share
      totalReward += (sharedCount || 0) * 20000;

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

      setStats({
        posts_count: postsCount,
        comments_count: commentsCount || 0,
        reactions_count: reactionsCount || 0,
        friends_count: friendsCount || 0,
        total_reward: totalReward,
      });
    } catch (error) {
      // Error fetching stats - silent fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[450px] w-full" />;
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="relative border border-yellow-500 rounded-lg p-2 bg-gradient-to-r from-green-800/50 to-green-700/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-yellow-400">
            {icon}
          </div>
          <span className="text-yellow-400 font-bold text-sm uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-white font-bold text-lg">{value.toLocaleString()}</span>
      </div>
    </div>
  );

return (
    <div className="sticky top-20 rounded-2xl overflow-hidden border-2 border-yellow-500 bg-gradient-to-br from-green-600 via-green-700 to-green-800 shadow-xl">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-2 left-2 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-4 right-4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-4 right-8 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative p-3 space-y-2">
        {/* Header with logo */}
        <div className="text-center space-y-1">
          <div className="inline-block">
            <div className="relative">
              <img 
                src="/fun-profile-logo.jpg" 
                alt="Fun Profile Web3"
                className="w-12 h-12 mx-auto rounded-full border border-yellow-400 shadow-lg"
              />
            </div>
          </div>
          
          {/* User info */}
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-white text-sm font-bold tracking-wide">{username?.toUpperCase() || 'USER'}</h2>
            <Avatar className="w-8 h-8 border-2 border-yellow-400">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-yellow-500 text-black font-bold text-xs">
                {username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h1 className="text-yellow-400 text-xl font-black tracking-wider drop-shadow-lg">
            HONOR BOARD
          </h1>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <StatRow 
            icon={<ArrowUp className="w-4 h-4" />}
            label="POSTS"
            value={stats.posts_count}
          />
          <StatRow 
            icon={<MessageCircle className="w-4 h-4" />}
            label="COMMENTS"
            value={stats.comments_count}
          />
          <StatRow 
            icon={<Star className="w-4 h-4" />}
            label="REACTIONS"
            value={stats.reactions_count}
          />
          <StatRow 
            icon={<Users className="w-4 h-4" />}
            label="FRIENDS"
            value={stats.friends_count}
          />
          <StatRow 
            icon={<BadgeDollarSign className="w-4 h-4" />}
            label="TOTAL REWARD"
            value={stats.total_reward}
          />
        </div>
      </div>
    </div>
  );
};
