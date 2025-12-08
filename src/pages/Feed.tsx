import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { FacebookCreatePost } from '@/components/feed/FacebookCreatePost';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';
import { FacebookRightSidebar } from '@/components/feed/FacebookRightSidebar';
import { StoriesBar } from '@/components/feed/StoriesBar';
import { Skeleton } from '@/components/ui/skeleton';

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

    // Realtime subscription for new posts
    const postsChannel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(postsChannel);
    };
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
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      
      <main className="pt-14">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4">
            {/* Left Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
              <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pr-2">
                <FacebookLeftSidebar />
              </div>
            </aside>

            {/* Main Feed */}
            <div className="lg:col-span-6 xl:col-span-6">
              {/* Stories */}
              <StoriesBar />

              {/* Create Post */}
              {currentUserId && <FacebookCreatePost onPostCreated={fetchPosts} />}

              {!currentUserId && (
                <div className="fb-card p-4 mb-4 text-center">
                  <p className="text-muted-foreground">
                    Đăng nhập để tạo bài viết và tương tác
                  </p>
                </div>
              )}

              {/* Posts */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="fb-card p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <Skeleton className="h-64 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="fb-card p-8 text-center">
                  <p className="text-muted-foreground">
                    Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <FacebookPostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onPostDeleted={fetchPosts}
                  />
                ))
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
              <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pl-2">
                <FacebookRightSidebar />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feed;
