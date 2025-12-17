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
      // Fetch all stats in parallel using Promise.all for better performance
      const [
        { data: posts },
        { count: commentsCount },
        { count: reactionsCount },
        { count: friendsCount },
        { count: sharedCount },
        { data: postReactions }
      ] = await Promise.all([
        // Fetch posts
        supabase
          .from('posts')
          .select('id')
          .eq('user_id', userId),
        
        // Fetch comments count
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Fetch reactions count (reactions this user made)
        supabase
          .from('reactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Fetch friends count (accepted friendships)
        supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted'),
        
        // Fetch shared posts count
        supabase
          .from('shared_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Fetch ALL reactions for user's posts in ONE query (optimized!)
        supabase
          .from('reactions')
          .select('post_id, posts!inner(user_id)')
          .eq('posts.user_id', userId)
      ]);

      // Calculate posts count
      const postsCount = posts?.length || 0;

      // Calculate rewards
      let totalReward = 50000; // New user bonus
      totalReward += postsCount * 10000; // Posts reward: 10,000 per post
      totalReward += (commentsCount || 0) * 5000; // Comments reward: 5,000 per comment
      totalReward += (friendsCount || 0) * 50000; // Friends reward: 50,000 per friend
      totalReward += (sharedCount || 0) * 20000; // Shared posts reward: 20,000 per share

      // Reactions on posts reward - optimized calculation
      if (postReactions && postReactions.length > 0 && posts && posts.length > 0) {
        // Group reactions by post_id and count them
        const reactionsByPost = postReactions.reduce((acc, reaction) => {
          acc[reaction.post_id] = (acc[reaction.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate reward for each post based on reactions
        posts.forEach(post => {
          const reactionsOnPost = reactionsByPost[post.id] || 0;
          if (reactionsOnPost >= 3) {
            totalReward += 30000 + (reactionsOnPost - 3) * 1000;
          }
        });
      }

      setStats({
        posts_count: postsCount,
        comments_count: commentsCount || 0,
        reactions_count: reactionsCount || 0,
        friends_count: friendsCount || 0,
        total_reward: totalReward,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[450px] w-full" />;
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="relative border border-yellow-400/50 rounded-md p-1.5 bg-gradient-to-r from-green-700/80 to-green-600/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div className="text-yellow-400">
            {icon}
          </div>
          <span className="text-yellow-400 font-bold text-[10px] uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-white font-bold text-xs">{value.toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className="h-full rounded-xl overflow-hidden border-2 border-yellow-500 bg-gradient-to-br from-green-600 via-green-700 to-green-800 shadow-xl">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-2 left-2 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-4 right-4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative p-2 h-full flex flex-col">
        {/* Header with logo */}
        <div className="text-center space-y-0.5 mb-1">
          <div className="inline-block">
            <img 
              src="/fun-profile-logo-40.webp" 
              alt="Fun Profile Web3"
              width={36}
              height={36}
              className="w-9 h-9 mx-auto rounded-full border border-yellow-400 shadow-lg"
            />
          </div>
          
          {/* User info */}
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-white text-[10px] font-bold tracking-wide">{username?.toUpperCase() || 'USER'}</h2>
            <Avatar className="w-6 h-6 border border-yellow-400">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-yellow-500 text-black font-bold text-[8px]">
                {username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h1 className="text-yellow-400 text-sm font-black tracking-wider drop-shadow-lg">
            HONOR BOARD
          </h1>
        </div>

        {/* Stats - 2 columns layout */}
        <div className="grid grid-cols-2 gap-1 flex-1">
          <StatRow 
            icon={<ArrowUp className="w-3 h-3" />}
            label="POSTS"
            value={stats.posts_count}
          />
          <StatRow 
            icon={<MessageCircle className="w-3 h-3" />}
            label="COMMENTS"
            value={stats.comments_count}
          />
          <StatRow 
            icon={<Star className="w-3 h-3" />}
            label="REACTIONS"
            value={stats.reactions_count}
          />
          <StatRow 
            icon={<Users className="w-3 h-3" />}
            label="FRIENDS"
            value={stats.friends_count}
          />
          <div className="col-span-2">
            <StatRow 
              icon={<BadgeDollarSign className="w-3 h-3" />}
              label="TOTAL REWARD"
              value={stats.total_reward}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
