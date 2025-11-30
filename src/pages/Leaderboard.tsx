import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string | null;
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  friends_count: number;
  total_reward: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      if (error) throw error;

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

          // Fetch reactions count (for display only, not used in calculation)
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
          let total_reward = 50000; // New user bonus
          const posts_count = posts?.length || 0;
          total_reward += posts_count * 10000; // Posts reward
          total_reward += (commentsCount || 0) * 5000; // Comments reward
          total_reward += (friendsCount || 0) * 50000; // Friends reward
          total_reward += (sharedCount || 0) * 20000; // Shared posts reward

          // Reactions on posts reward
          if (posts && posts.length > 0) {
            for (const post of posts) {
              const { count: postReactionsCount } = await supabase
                .from('reactions')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const reactionsOnPost = postReactionsCount || 0;
              if (reactionsOnPost >= 3) {
                total_reward += 30000 + (reactionsOnPost - 3) * 1000;
              }
            }
          }

          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            posts_count,
            comments_count: commentsCount || 0,
            reactions_count: reactionsCount || 0,
            friends_count: friendsCount || 0,
            total_reward
          };
        })
      );

      const sortedUsers = usersWithRewards.sort((a, b) => b.total_reward - a.total_reward);
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/space-background.mp4" type="video/mp4" />
        </video>
      </div>

      <Navbar />
      <div className="container max-w-4xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
        <div className="glass-card-light p-6 rounded-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">🏆 Bảng Xếp Hạng Tổng Thưởng</h1>
            <p className="text-muted-foreground">Danh sách người dùng có tổng Camly Coin cao nhất</p>
          </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chưa có dữ liệu xếp hạng</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => {
              const rank = index + 1;
              return (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="flex items-center gap-4 p-4 bg-white border-2 border-gold rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getRankBadge(rank)}`}>
                    {rank <= 3 ? getRankIcon(rank) : rank}
                  </div>
                  
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{user.username}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>{user.posts_count} bài viết</span>
                      <span>{user.comments_count} bình luận</span>
                      <span>{user.friends_count} bạn bè</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">
                      {user.total_reward.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Camly Coin</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
