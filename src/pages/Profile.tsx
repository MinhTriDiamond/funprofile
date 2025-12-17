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
import { ProfileHonorBoard } from '@/components/profile/ProfileHonorBoard';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/LazyImage';
import { CoverPhotoEditor } from '@/components/profile/CoverPhotoEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Plus, PenSquare, MoreHorizontal, MapPin, Briefcase, GraduationCap, Heart, Clock } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [sharedPosts, setSharedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setCurrentUserId(session.user.id);
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
  }, [navigate, userId]);

  const fetchProfile = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(data);

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

      setPosts(postsData || []);

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

      setSharedPosts(sharedPostsData || []);

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
      <main className="pt-14">
        {/* Cover Photo Section with Honor Board */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4 mt-4">
            {/* Cover Photo Container */}
            <div className="flex-1 relative h-[200px] sm:h-[300px] md:h-[350px] rounded-xl overflow-hidden">
              {profile?.cover_url ? (
                <LazyImage 
                  src={profile.cover_url} 
                  alt="Cover" 
                  className="w-full h-full"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/40 via-gold/30 to-primary/40" />
              )}
              
              {/* Inner Gradient Overlay for Soft Edges */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-[#f0f2f5] via-[#f0f2f5]/60 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-[#f0f2f5] via-[#f0f2f5]/60 to-transparent" />
              </div>
              
              {/* Edit Cover Button */}
              {isOwnProfile && (
                <div className="absolute bottom-4 right-4 z-[100]">
                  <CoverPhotoEditor 
                    userId={currentUserId}
                    currentCoverUrl={profile?.cover_url}
                    onCoverUpdated={(newUrl) => setProfile({ ...profile, cover_url: newUrl })}
                  />
                </div>
              )}
            </div>

            {/* Profile Honor Board - Right of Cover */}
            <div className="hidden lg:block w-[280px] h-[350px]">
              <ProfileHonorBoard 
                userId={profile.id}
                username={profile?.username || ''}
                avatarUrl={profile?.avatar_url}
              />
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 pb-4 -mt-8 md:-mt-16 relative">
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
                <Avatar className="w-32 h-32 md:w-44 md:h-44 border-4 border-white shadow-lg">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-4xl md:text-5xl bg-primary text-white">
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Name and Stats */}
              <div className="flex-1 text-center md:text-left md:pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profile?.full_name || profile?.username}
                </h1>
                <p className="text-muted-foreground">{friendsCount} bạn bè</p>
                {/* Friend Avatars */}
                <div className="flex justify-center md:justify-start -space-x-2 mt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white" />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pb-4">
                {isOwnProfile ? (
                  <>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm vào tin
                    </Button>
                    <Button variant="secondary">
                      <PenSquare className="w-4 h-4 mr-2" />
                      Chỉnh sửa trang cá nhân
                    </Button>
                  </>
                ) : (
                  <>
                    <FriendRequestButton userId={profile.id} currentUserId={currentUserId} />
                    <Button variant="secondary">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-t">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="h-auto bg-transparent p-0 border-0 justify-start gap-0">
                  <TabsTrigger 
                    value="posts" 
                    className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
                  >
                    Bài viết
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about" 
                    className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
                  >
                    Giới thiệu
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
                  >
                    Bạn bè
                  </TabsTrigger>
                  <TabsTrigger 
                    value="photos" 
                    className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
                  >
                    Ảnh
                  </TabsTrigger>
                  <TabsTrigger 
                    value="videos" 
                    className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
                  >
                    Video
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger 
                      value="edit" 
                      className="px-4 py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold"
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
                            {posts.filter(p => p.image_url).slice(0, 9).map((post, i) => (
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
                        {posts.length === 0 && sharedPosts.length === 0 ? (
                          <div className="bg-white rounded-lg shadow p-8 text-center text-muted-foreground">
                            Chưa có bài viết nào
                          </div>
                        ) : (
                          <>
                            {sharedPosts.map((sharedPost) => (
                              sharedPost.posts && (
                                <div key={sharedPost.id} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                    <span className="font-semibold text-primary">Đã share</span>
                                  </div>
                                  <FacebookPostCard 
                                    post={sharedPost.posts} 
                                    currentUserId={currentUserId}
                                    onPostDeleted={handlePostDeleted}
                                  />
                                </div>
                              )
                            ))}
                            {posts.map((post) => (
                              <FacebookPostCard 
                                key={post.id} 
                                post={post} 
                                currentUserId={currentUserId}
                                onPostDeleted={handlePostDeleted}
                              />
                            ))}
                          </>
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
                            {posts.filter(p => p.image_url).map((post, i) => (
                              <img 
                                key={i}
                                src={post.image_url}
                                alt=""
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ))}
                          </div>
                          {posts.filter(p => p.image_url).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Chưa có ảnh nào</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="videos" className="mt-0">
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="font-bold text-xl mb-4">Video</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {posts.filter(p => p.video_url).map((post, i) => (
                              <video 
                                key={i}
                                src={post.video_url}
                                className="w-full aspect-video object-cover rounded-lg"
                                controls
                              />
                            ))}
                          </div>
                          {posts.filter(p => p.video_url).length === 0 && (
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
    </div>
  );
};

export default Profile;
