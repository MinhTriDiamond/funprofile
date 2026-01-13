import { useEffect, useState, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditProfile } from '@/components/profile/EditProfile';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { FriendRequestButton } from '@/components/friends/FriendRequestButton';
import { FriendsList } from '@/components/friends/FriendsList';
import { CoverHonorBoard } from '@/components/profile/CoverHonorBoard';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/LazyImage';
import { CoverPhotoEditor } from '@/components/profile/CoverPhotoEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Plus, PenSquare, MoreHorizontal, MapPin, Briefcase, GraduationCap, Heart, Clock, MessageCircle } from 'lucide-react';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useConversations } from '@/hooks/useConversations';

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
          fetchProfile(profileData.id);
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
      fetchProfile(profileId);
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

  const fetchProfile = async (profileId: string) => {
    try {
      // For own profile, fetch all fields; for others, use limited fields
      const isViewingOwnProfile = profileId === currentUserId;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(isViewingOwnProfile 
          ? '*' 
          : 'id, username, avatar_url, full_name, bio, cover_url, created_at, soul_level, total_rewards')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Fetch user's own posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url, full_name),
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
            profiles (username, avatar_url, full_name),
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
    <div className="min-h-screen bg-[#f0f2f5]">
      <FacebookNavbar />
      <main className="pt-14 pb-20 lg:pb-4">
        {/* Cover Photo Section - Full Width */}
        <div className="relative">
          {/* Cover Photo Container - Smaller on mobile to make room for honor board */}
          <div className="h-[180px] sm:h-[280px] md:h-[380px] relative overflow-hidden">
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
            
            {/* Inner Gradient Overlay for Soft Edges - Hide on mobile */}
            <div className="absolute inset-0 pointer-events-none hidden md:block">
              <div className="absolute inset-y-0 left-0 w-32 md:w-48 bg-gradient-to-r from-[#f0f2f5] via-[#f0f2f5]/60 to-transparent" />
            </div>

            {/* Honor Board on Cover Photo - Desktop only (hidden on mobile via component) */}
            <CoverHonorBoard 
              userId={profile.id}
              username={profile?.full_name || profile?.username}
              avatarUrl={profile?.avatar_url}
            />
          </div>
          
          {/* Edit Cover Button - Outside overflow container for proper z-index */}
          {isOwnProfile && (
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-[100]">
              <CoverPhotoEditor 
                userId={currentUserId}
                currentCoverUrl={profile?.cover_url}
                onCoverUpdated={(newUrl) => setProfile({ ...profile, cover_url: newUrl })}
              />
            </div>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-2 sm:px-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-4 pb-3 md:pb-4 -mt-12 sm:-mt-8 md:-mt-16 relative">
              {/* Avatar */}
              {isOwnProfile ? (
                <AvatarEditor
                  userId={currentUserId}
                  currentAvatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  onAvatarUpdated={(newUrl) => setProfile({ ...profile, avatar_url: newUrl })}
                  size="large"
                />
              ) : (
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 border-4 border-white shadow-lg">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} sizeHint="lg" />}
                  <AvatarFallback className="text-3xl sm:text-4xl md:text-5xl bg-primary text-white">
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Name and Stats */}
              <div className="flex-1 text-center md:text-left md:pb-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {profile?.full_name || profile?.username}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">{friendsCount} bạn bè</p>
                {/* Friend Avatars - Hide on very small screens */}
                <div className="hidden sm:flex justify-center md:justify-start -space-x-2 mt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-300 border-2 border-white" />
                  ))}
                </div>
              </div>

              {/* Action Buttons - Stack on mobile */}
              <div className="flex flex-wrap justify-center gap-2 pb-2 md:pb-4 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs sm:text-sm min-h-[44px] px-3 sm:px-4">
                      <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Thêm vào tin</span>
                      <span className="xs:hidden">Thêm tin</span>
                    </Button>
                    <Button size="sm" variant="secondary" className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4">
                      <PenSquare className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Chỉnh sửa trang cá nhân</span>
                      <span className="sm:hidden">Sửa hồ sơ</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <FriendRequestButton userId={profile.id} currentUserId={currentUserId} />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="min-h-[44px] px-3 sm:px-4"
                      onClick={handleStartChat}
                      disabled={createDirectConversation.isPending}
                    >
                      <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Nhắn tin</span>
                    </Button>
                    <Button size="sm" variant="secondary" className="min-h-[44px] min-w-[44px]">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs - Horizontal scroll on mobile */}
            <div className="border-t -mx-2 sm:mx-0">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="h-auto bg-transparent p-0 border-0 justify-start gap-0 flex overflow-x-auto scrollbar-hide">
                  <TabsTrigger 
                    value="posts" 
                    className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                  >
                    Bài viết
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about" 
                    className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                  >
                    Giới thiệu
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                  >
                    Bạn bè
                  </TabsTrigger>
                  <TabsTrigger 
                    value="photos" 
                    className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                  >
                    Ảnh
                  </TabsTrigger>
                  <TabsTrigger 
                    value="videos" 
                    className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                  >
                    Video
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger 
                      value="edit" 
                      className="px-3 sm:px-4 py-3 sm:py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-sm sm:text-base whitespace-nowrap flex-shrink-0"
                    >
                      Chỉnh sửa
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="py-4">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Left Sidebar - Intro */}
                    <div className="lg:col-span-2 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {/* Intro Card */}
                        <div className="bg-white rounded-lg shadow p-4">
                          <h3 className="font-bold text-lg mb-3">Giới thiệu</h3>
                          <p className="text-center text-muted-foreground mb-4">
                            {profile?.bio || 'Chưa có tiểu sử'}
                          </p>
                          {isOwnProfile && (
                            <Button variant="secondary" className="w-full">
                              Thêm tiểu sử
                            </Button>
                          )}
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Briefcase className="w-5 h-5" />
                              <span>Làm việc tại <strong className="text-foreground">FUN Profile</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-5 h-5" />
                              <span>Sống tại <strong className="text-foreground">Việt Nam</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-5 h-5" />
                              <span>Tham gia từ {new Date(profile?.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Photos Card */}
                        <div className="bg-white rounded-lg shadow p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg">Ảnh</h3>
                            <button className="text-primary hover:underline text-sm">Xem tất cả ảnh</button>
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
                          </div>
                        </div>

                        {/* Friends Card */}
                        <div className="bg-white rounded-lg shadow p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="font-bold text-lg">Bạn bè</h3>
                              <p className="text-sm text-muted-foreground">{friendsCount} người bạn</p>
                            </div>
                            <button className="text-primary hover:underline text-sm">Xem tất cả bạn bè</button>
                          </div>
                        </div>
                      </TabsContent>
                    </div>

                    {/* Right Content - Posts */}
                    <div className="lg:col-span-3 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {allPosts.length === 0 ? (
                          <div className="bg-white rounded-lg shadow p-8 text-center text-muted-foreground">
                            Chưa có bài viết nào
                          </div>
                        ) : (
                          allPosts.map((item) => (
                            item._type === 'shared' ? (
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
                              <FacebookPostCard 
                                key={item.id} 
                                post={item} 
                                currentUserId={currentUserId}
                                onPostDeleted={handlePostDeleted}
                              />
                            )
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="about" className="mt-0">
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="font-bold text-xl mb-4">Giới thiệu</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <Briefcase className="w-6 h-6 text-muted-foreground" />
                              <span>Làm việc tại <strong>FUN Profile</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-6 h-6 text-muted-foreground" />
                              <span>Học tại <strong>Đại học Vũ Trụ</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="w-6 h-6 text-muted-foreground" />
                              <span>Sống tại <strong>Việt Nam</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Heart className="w-6 h-6 text-muted-foreground" />
                              <span>Độc thân</span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="friends" className="mt-0">
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="font-bold text-xl mb-4">Bạn bè</h3>
                          <FriendsList userId={profile.id} />
                        </div>
                      </TabsContent>

                      <TabsContent value="photos" className="mt-0">
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="font-bold text-xl mb-4">Ảnh</h3>
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
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="font-bold text-xl mb-4">Video</h3>
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
                            <p className="text-center text-muted-foreground py-8">Chưa có video nào</p>
                          )}
                        </div>
                      </TabsContent>

                      {isOwnProfile && (
                        <TabsContent value="edit" className="mt-0">
                          <div className="bg-white rounded-lg shadow p-6">
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
