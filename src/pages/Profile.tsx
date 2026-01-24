import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditProfile } from '@/components/profile/EditProfile';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { FacebookCreatePost } from '@/components/feed/FacebookCreatePost';
import { FriendRequestButton } from '@/components/friends/FriendRequestButton';
import { FriendsList } from '@/components/friends/FriendsList';
import { CoverHonorBoard } from '@/components/profile/CoverHonorBoard';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/LazyImage';
import { CoverPhotoEditor } from '@/components/profile/CoverPhotoEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { MoreHorizontal, MapPin, Briefcase, GraduationCap, Heart, Clock, MessageCircle, Eye, X, Pin, PenSquare } from 'lucide-react';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useConversations } from '@/hooks/useConversations';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { userId, username } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]); // Combined and sorted posts
  const [originalPosts, setOriginalPosts] = useState<any[]>([]); // For photos grid
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  
  const { createDirectConversation } = useConversations(currentUserId);
  
  const handleStartChat = async () => {
    if (!currentUserId || !profile?.id) return;
    try {
      const result = await createDirectConversation.mutateAsync(profile.id);
      if (result) {
        navigate(`/chat/${result.id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };
  const [viewAsPublic, setViewAsPublic] = useState(false);

  // Determine if we should show private elements (own profile AND not in View As mode)
  const showPrivateElements = isOwnProfile && !viewAsPublic;

  // Reserved paths that should NOT be treated as usernames
  const reservedPaths = ['auth', 'feed', 'friends', 'wallet', 'about', 'leaderboard', 'admin', 'notifications', 'docs', 'post', 'law-of-light', 'profile'];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setCurrentUserId(session.user.id);
      }
      
      // Check if username route is actually a reserved path
      if (username && reservedPaths.includes(username.toLowerCase())) {
        navigate(`/${username}`);
        return;
      }
      
      // If username is provided, look up by username
      if (username) {
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .single();
        
        if (profileData) {
          setIsOwnProfile(session ? profileData.id === session.user.id : false);
          fetchProfile(profileData.id, session?.user.id);
        } else {
          setLoading(false);
          setProfile(null);
        }
        return;
      }
      
      let profileId = userId;
      if (!userId) {
        if (session) {
          profileId = session.user.id;
        } else {
          navigate('/auth');
          return;
        }
      }
      
      setIsOwnProfile(session ? profileId === session.user.id : false);
      fetchProfile(profileId, session?.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUserId(session.user.id);
        if (userId) {
          setIsOwnProfile(session.user.id === userId);
        }
      } else {
        setCurrentUserId('');
        setIsOwnProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, userId, username]);

  const fetchProfile = async (profileId: string, authUserId?: string) => {
    try {
      // For own profile, fetch all fields; for others, use limited fields
      // Use authUserId passed directly to avoid stale state issues
      const isViewingOwnProfile = authUserId ? profileId === authUserId : profileId === currentUserId;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(isViewingOwnProfile 
          ? '*' 
          : 'id, username, avatar_url, full_name, bio, cover_url, created_at, soul_level, total_rewards, pinned_post_id')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Fetch user's own posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (username, avatar_url, full_name),
          reactions (id, user_id, type),
          comments (id)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      setOriginalPosts(postsData || []); // Keep for photos grid

      // Fetch shared posts
      const { data: sharedPostsData } = await supabase
        .from('shared_posts')
        .select(`
          *,
          posts:original_post_id (
            *,
            profiles!posts_user_id_fkey (username, avatar_url, full_name),
            reactions (id, user_id, type),
            comments (id)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      // Combine and sort all posts by created_at (shared posts use their share time)
      const combinedPosts: any[] = [];
      
      // Add original posts with type marker
      (postsData || []).forEach(post => {
        combinedPosts.push({
          ...post,
          _type: 'original',
          _sortTime: new Date(post.created_at).getTime()
        });
      });
      
      // Add shared posts with type marker (using share time for sorting)
      (sharedPostsData || []).forEach(sharedPost => {
        if (sharedPost.posts) {
          combinedPosts.push({
            ...sharedPost,
            _type: 'shared',
            _sortTime: new Date(sharedPost.created_at).getTime() // Use share time, not original post time
          });
        }
      });
      
      // Sort by time descending (newest first)
      combinedPosts.sort((a, b) => b._sortTime - a._sortTime);
      
      setAllPosts(combinedPosts);

      // Fetch friends count
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
        .eq('status', 'accepted');

      setFriendsCount(count || 0);
    } catch (error) {
      // Error fetching profile - silent fail
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = () => {
    const profileId = userId || currentUserId;
    if (profileId) {
      fetchProfile(profileId);
    }
  };

  // Handle pin/unpin post
  const handlePinPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pinned_post_id: postId })
        .eq('id', currentUserId);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, pinned_post_id: postId }));
      toast.success('Đã ghim bài viết');
    } catch (error) {
      toast.error('Không thể ghim bài viết');
    }
  };

  const handleUnpinPost = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pinned_post_id: null })
        .eq('id', currentUserId);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, pinned_post_id: null }));
      toast.success('Đã bỏ ghim bài viết');
    } catch (error) {
      toast.error('Không thể bỏ ghim bài viết');
    }
  };

  // Sort posts with pinned post first
  const sortedPosts = useMemo(() => {
    if (!profile?.pinned_post_id) return allPosts;
    
    const pinnedPost = allPosts.find(
      (item) => item._type === 'original' && item.id === profile.pinned_post_id
    );
    
    if (!pinnedPost) return allPosts;
    
    const otherPosts = allPosts.filter(
      (item) => !(item._type === 'original' && item.id === profile.pinned_post_id)
    );
    
    return [pinnedPost, ...otherPosts];
  }, [allPosts, profile?.pinned_post_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <FacebookNavbar />
        <main className="pt-14">
          <Skeleton className="h-[350px] w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <FacebookNavbar />
        <main className="pt-14">
          <div className="max-w-5xl mx-auto px-4 text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy trang cá nhân</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      
      {/* View As Banner */}
      {viewAsPublic && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 flex items-center justify-center gap-4 shadow-lg">
          <Eye className="w-5 h-5" />
          <span className="font-medium">Bạn đang xem trang cá nhân với tư cách người khác</span>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => setViewAsPublic(false)}
            className="ml-2"
          >
            <X className="w-4 h-4 mr-1" />
            Thoát chế độ xem
          </Button>
        </div>
      )}
      
      <main className={`pb-20 lg:pb-4 ${viewAsPublic ? 'pt-28' : 'pt-14'}`}>
        {/* Cover Photo Section - Facebook 2025 Style */}
        <div className="max-w-[1100px] mx-auto px-0 md:px-4">
          <div className="relative">
            {/* Cover Photo Container with rounded corners */}
            <div className="h-[200px] sm:h-[300px] md:h-[400px] relative overflow-visible md:rounded-b-xl">
              {profile?.cover_url ? (
                <LazyImage 
                  src={profile.cover_url} 
                  alt="Cover" 
                  className="w-full h-full"
                  transformPreset="cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/40 via-gold/30 to-primary/40" />
              )}
              
              {/* Gradient overlay at bottom for better text readability */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

              {/* Honor Board moved to profile info section */}

              {/* Edit Cover Button - bottom right, below Honor Board */}
              {showPrivateElements && (
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[100] isolate">
                  <CoverPhotoEditor 
                    userId={currentUserId}
                    currentCoverUrl={profile?.cover_url}
                    onCoverUpdated={(newUrl) => setProfile({ ...profile, cover_url: newUrl })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Profile Info Section - Facebook 2025 Layout */}
          <div className="bg-card border-b border-border shadow-sm md:rounded-b-xl">
            <div className="px-4 md:px-8 py-4 md:py-6">
              {/* Avatar + Info Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Avatar - positioned lower, centered in white space */}
                <div className="-mt-2 sm:-mt-4 md:-mt-6 relative z-10 flex justify-center md:justify-start flex-shrink-0">
                  {showPrivateElements ? (
                    <div className="ring-4 ring-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                      <AvatarEditor
                        userId={currentUserId}
                        currentAvatarUrl={profile?.avatar_url}
                        username={profile?.username}
                        onAvatarUpdated={(newUrl) => setProfile({ ...profile, avatar_url: newUrl })}
                        size="xl"
                      />
                    </div>
                  ) : (
                    <Avatar className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 ring-4 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} sizeHint="lg" />}
                      <AvatarFallback className="text-4xl md:text-5xl bg-primary text-primary-foreground">
                        {profile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* Name, Friends, Bio, Info - Facebook style inline */}
                <div className="flex-1 text-center md:text-left md:ml-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                    {profile?.full_name || profile?.username}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground font-medium">
                    {friendsCount.toLocaleString('vi-VN')} người bạn
                  </p>
                  
                  {/* Bio text - inline */}
                  {profile?.bio && (
                    <p className="text-base sm:text-lg text-muted-foreground mt-1 line-clamp-1">
                      {profile.bio}
                    </p>
                  )}
                  
                  {/* Info badges - all in one horizontal row */}
                  <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-4 mt-2 text-base sm:text-lg text-muted-foreground">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <MapPin className="w-5 h-5 flex-shrink-0" />
                      <span>Việt Nam</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Briefcase className="w-5 h-5 flex-shrink-0" />
                      <span>FUN Ecosystem</span>
                    </div>
                  </div>
                  
                  {/* Friend Avatars Stack */}
                  <div className="hidden md:flex -space-x-2 mt-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-card" />
                    ))}
                  </div>
                </div>

                {/* Honor Board - right aligned, moved down with top margin */}
                <div className="hidden md:flex justify-end mt-4 md:mt-6">
                  <div className="w-full max-w-[600px]">
                    <CoverHonorBoard 
                      userId={profile.id}
                      username={profile?.full_name || profile?.username}
                      avatarUrl={profile?.avatar_url}
                    />
                  </div>
                </div>

                {/* Action Buttons for other users - Facebook style */}
                {!isOwnProfile && !viewAsPublic && (
                  <div className="flex flex-wrap justify-center md:hidden gap-2 pb-2">
                    <FriendRequestButton userId={profile.id} currentUserId={currentUserId} />
                    <Button 
                      variant="secondary" 
                      className="font-semibold px-4 h-10"
                      onClick={handleStartChat}
                      disabled={createDirectConversation.isPending}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Nhắn tin
                    </Button>
                    <Button variant="secondary" size="icon" className="h-10 w-10">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs - Facebook 2025 style with underline */}
            <div className="border-t border-border px-4 md:px-8">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="h-auto bg-transparent p-0 border-0 justify-start gap-1 flex overflow-x-auto scrollbar-hide -mb-px">
                  <TabsTrigger 
                    value="posts" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    Tất cả
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    Giới thiệu
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    Bạn bè
                  </TabsTrigger>
                  <TabsTrigger 
                    value="photos" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    Ảnh
                  </TabsTrigger>
                  <TabsTrigger 
                    value="videos" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    Reels
                  </TabsTrigger>
                  {showPrivateElements && (
                    <TabsTrigger 
                      value="edit" 
                      className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                    >
                      Xem thêm ▼
                    </TabsTrigger>
                  )}
                  <div className="flex-1" />
                  <Button variant="secondary" size="icon" className="h-10 w-10 my-2 mr-2 flex-shrink-0">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </TabsList>

                <div className="py-4 px-4 md:px-8">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Left Sidebar - Intro */}
                    <div className="lg:col-span-2 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {/* Intro Card - Facebook style */}
                        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-foreground">Thông tin cá nhân</h3>
                            {showPrivateElements && (
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <PenSquare className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-foreground">
                              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>Sống ở <strong>Việt Nam</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <Briefcase className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>Làm việc tại <strong>FUN Ecosystem</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <GraduationCap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>Học tại <strong>Đại học Vũ Trụ</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <Heart className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>Độc thân</span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>Tham gia từ {new Date(profile?.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                            </div>
                          </div>
                          
                          {showPrivateElements && (
                            <Button variant="secondary" className="w-full mt-4">
                              Chỉnh sửa chi tiết
                            </Button>
                          )}
                        </div>

                        {/* Photos Card - Facebook style */}
                        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-foreground">Ảnh</h3>
                            <button className="text-primary hover:underline text-sm font-medium">Xem tất cả ảnh</button>
                          </div>
                          <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                            {originalPosts.filter(p => p.image_url).slice(0, 9).map((post, i) => (
                              <LazyImage 
                                key={i}
                                src={post.image_url}
                                alt=""
                                className="w-full aspect-square"
                              />
                            ))}
                            {originalPosts.filter(p => p.image_url).length === 0 && (
                              <div className="col-span-3 py-8 text-center text-muted-foreground text-sm">
                                Chưa có ảnh nào
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Friends Card - Facebook style */}
                        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="font-bold text-lg text-foreground">Bạn bè</h3>
                              <p className="text-sm text-muted-foreground">{friendsCount} người bạn</p>
                            </div>
                            <button className="text-primary hover:underline text-sm font-medium">Xem tất cả bạn bè</button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="text-center">
                                <div className="aspect-square bg-muted rounded-lg mb-1" />
                                <p className="text-xs text-foreground truncate">Bạn bè {i}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </div>

                    {/* Right Content - Posts */}
                    <div className="lg:col-span-3 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {/* Create Post - Facebook style */}
                        {showPrivateElements && currentUserId && (
                          <FacebookCreatePost 
                            onPostCreated={() => {
                              const profileId = userId || currentUserId;
                              if (profileId) {
                                fetchProfile(profileId);
                              }
                            }}
                          />
                        )}
                        
                        {sortedPosts.length === 0 ? (
                          <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center text-muted-foreground">
                            Chưa có bài viết nào
                          </div>
                        ) : (
                          sortedPosts.map((item) => {
                            const isPinned = item._type === 'original' && item.id === profile?.pinned_post_id;
                            
                            return item._type === 'shared' ? (
                              <div key={`shared-${item.id}`} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                  <span className="font-semibold text-primary">Đã share</span>
                                </div>
                                <FacebookPostCard 
                                  post={item.posts} 
                                  currentUserId={currentUserId}
                                  onPostDeleted={handlePostDeleted}
                                />
                              </div>
                            ) : (
                              <div key={item.id} className="space-y-0">
                                {/* Pinned Post Badge */}
                                {isPinned && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-secondary/50 rounded-t-xl border-b border-border">
                                    <Pin className="w-4 h-4 text-primary" />
                                    <span className="font-medium">Bài viết được ghim</span>
                                  </div>
                                )}
                                <FacebookPostCard 
                                  post={item} 
                                  currentUserId={currentUserId}
                                  onPostDeleted={handlePostDeleted}
                                  isPinned={isPinned}
                                  onPinPost={showPrivateElements ? handlePinPost : undefined}
                                  onUnpinPost={showPrivateElements ? handleUnpinPost : undefined}
                                  isOwnProfile={isOwnProfile}
                                  viewAsPublic={viewAsPublic}
                                />
                              </div>
                            );
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="about" className="mt-0">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">Giới thiệu</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 text-foreground">
                              <Briefcase className="w-6 h-6 text-muted-foreground" />
                              <span>Làm việc tại <strong>FUN Ecosystem</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <GraduationCap className="w-6 h-6 text-muted-foreground" />
                              <span>Học tại <strong>Đại học Vũ Trụ</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <MapPin className="w-6 h-6 text-muted-foreground" />
                              <span>Sống tại <strong>Việt Nam</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground">
                              <Heart className="w-6 h-6 text-muted-foreground" />
                              <span>Độc thân</span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="friends" className="mt-0">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">Bạn bè</h3>
                          <FriendsList userId={profile.id} />
                        </div>
                      </TabsContent>

                      <TabsContent value="photos" className="mt-0">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">Ảnh</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {originalPosts.filter(p => p.image_url).map((post, i) => (
                              <img 
                                key={i}
                                src={post.image_url}
                                alt=""
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ))}
                          </div>
                          {originalPosts.filter(p => p.image_url).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Chưa có ảnh nào</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="videos" className="mt-0">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">Reels</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {originalPosts.filter(p => p.video_url).map((post, i) => (
                              <video 
                                key={i}
                                src={post.video_url}
                                className="w-full aspect-video object-cover rounded-lg"
                                controls
                              />
                            ))}
                          </div>
                          {originalPosts.filter(p => p.video_url).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Chưa có reels nào</p>
                          )}
                        </div>
                      </TabsContent>

                      {showPrivateElements && (
                        <TabsContent value="edit" className="mt-0">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <EditProfile />
                          </div>
                        </TabsContent>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation with Honor Board */}
      <MobileBottomNav />
    </div>
  );
};

export default Profile;
