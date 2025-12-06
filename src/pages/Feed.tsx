import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { CreatePost } from '@/components/feed/CreatePost';
import { PostCard } from '@/components/feed/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { HonorBoard } from '@/components/feed/HonorBoard';
import { LeftSidebar } from '@/components/feed/LeftSidebar';

const Feed = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
      fetchPosts();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserId('');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      setPosts(data || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      <Navbar />
      
      <main className="pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Hidden on mobile */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                <LeftSidebar />
              </div>
            </aside>

            {/* Main Feed */}
            <div className="lg:col-span-6">
              <div className="space-y-4">
                {currentUserId && <CreatePost onPostCreated={fetchPosts} />}
                
                {!currentUserId && (
                  <div className="p-4 bg-card rounded-xl text-center shadow-sm border">
                    <p className="text-sm text-muted-foreground">
                      Đăng nhập để tạo bài viết và tương tác
                    </p>
                  </div>
                )}
                
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-xl shadow-sm border">
                    <p className="text-muted-foreground">Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onPostDeleted={fetchPosts}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Sidebar - Hidden on mobile */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                <HonorBoard />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feed;
