import { useEffect, useState, lazy, Suspense, memo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const FacebookCreatePost = lazy(() => import('@/components/feed/FacebookCreatePost').then(m => ({ default: m.FacebookCreatePost })));
const FacebookPostCard = lazy(() => import('@/components/feed/FacebookPostCard').then(m => ({ default: m.FacebookPostCard })));
const FacebookLeftSidebar = lazy(() => import('@/components/feed/FacebookLeftSidebar').then(m => ({ default: m.FacebookLeftSidebar })));
const FacebookRightSidebar = lazy(() => import('@/components/feed/FacebookRightSidebar').then(m => ({ default: m.FacebookRightSidebar })));
const StoriesBar = lazy(() => import('@/components/feed/StoriesBar').then(m => ({ default: m.StoriesBar })));

// Lightweight skeleton components
const SidebarSkeleton = memo(() => (
  <div className="space-y-3">
    <div className="fb-card p-4">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  </div>
));
SidebarSkeleton.displayName = 'SidebarSkeleton';

const StoriesSkeleton = memo(() => (
  <div className="fb-card p-4 mb-4">
    <div className="flex gap-2 overflow-hidden">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-24 h-40 rounded-lg flex-shrink-0" />)}
    </div>
  </div>
));
StoriesSkeleton.displayName = 'StoriesSkeleton';

const PostSkeleton = memo(() => (
  <div className="fb-card p-4">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4 mb-4" />
    <Skeleton className="h-48 w-full rounded-lg" />
  </div>
));
PostSkeleton.displayName = 'PostSkeleton';

const Feed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles!posts_user_id_fkey (username, avatar_url)`)
        .order('created_at', { ascending: false })
        .limit(20); // Limit initial load

      if (error) {
        setPosts([]);
        return;
      }
      setPosts(data || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
      fetchPosts();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user?.id || '');
    });

    const postsChannel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(postsChannel);
    };
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      
      <main className="pt-14">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4">
            {/* Left Sidebar - Deferred */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pr-2">
                <Suspense fallback={<SidebarSkeleton />}>
                  <FacebookLeftSidebar />
                </Suspense>
              </div>
            </aside>

            {/* Main Feed */}
            <div className="lg:col-span-6">
              {/* Stories - Deferred */}
              <Suspense fallback={<StoriesSkeleton />}>
                <StoriesBar />
              </Suspense>

              {/* Create Post */}
              {currentUserId && (
                <Suspense fallback={<Skeleton className="h-24 w-full mb-4 rounded-lg" />}>
                  <FacebookCreatePost onPostCreated={fetchPosts} />
                </Suspense>
              )}

              {!currentUserId && (
                <div className="fb-card p-4 mb-4 text-center">
                  <p className="text-muted-foreground">Đăng nhập để tạo bài viết</p>
                </div>
              )}

              {/* Posts */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                </div>
              ) : posts.length === 0 ? (
                <div className="fb-card p-8 text-center">
                  <p className="text-muted-foreground">Chưa có bài viết nào</p>
                </div>
              ) : (
                <Suspense fallback={<div className="space-y-4">{[1, 2].map(i => <PostSkeleton key={i} />)}</div>}>
                  <div className="space-y-4">
                    {posts.map(post => (
                      <FacebookPostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUserId}
                        onPostDeleted={fetchPosts}
                      />
                    ))}
                  </div>
                </Suspense>
              )}
            </div>

            {/* Right Sidebar - Deferred */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pl-2">
                <Suspense fallback={<SidebarSkeleton />}>
                  <FacebookRightSidebar />
                </Suspense>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feed;
