import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditProfile } from '@/components/profile/EditProfile';
import { PostCard } from '@/components/feed/PostCard';

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setCurrentUserId(session.user.id);
      
      // If userId param exists, view that profile, otherwise view own profile
      const profileId = userId || session.user.id;
      setIsOwnProfile(profileId === session.user.id);
      fetchProfile(profileId);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
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

      // Fetch user posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url),
          reactions (id, user_id),
          comments (id)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-2xl py-8">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-3xl">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{profile?.username}</CardTitle>
              <p className="text-muted-foreground">{profile?.full_name || 'No name set'}</p>
            </CardHeader>
            <CardContent>
              <p className="text-center">{profile?.bio || 'No bio yet'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="posts">{isOwnProfile ? 'My Posts' : 'Posts'}</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="edit">Edit Profile</TabsTrigger>}
          </TabsList>
          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No posts yet
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentUserId}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            )}
          </TabsContent>
          {isOwnProfile && (
            <TabsContent value="edit" className="mt-6">
              <EditProfile />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
