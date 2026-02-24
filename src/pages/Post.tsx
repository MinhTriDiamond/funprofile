import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const Post = () => {
  const { postId, username, slug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);

      let query = supabase
        .from('posts')
        .select(`
          *,
          public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address),
          reactions (id, user_id, type),
          comments (id)
        `);

      if (postId) {
        // Legacy UUID route: /post/:postId
        query = query.eq('id', postId);
      } else if (username && slug) {
        // New slug route: /:username/post/:slug
        // First find user by username, then find post by slug
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (!profile) {
          setPost(null);
          setLoading(false);
          return;
        }

        query = query.eq('user_id', profile.id).eq('slug', slug);
      } else {
        setPost(null);
        setLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        setPost(null);
      } else {
        const mappedData = { ...data, profiles: (data as any).public_profiles || (data as any).profiles };
        setPost(mappedData);
      }
      setLoading(false);
    };

    fetchPost();
  }, [postId, username, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] overflow-hidden pb-20 lg:pb-0">
        <FacebookNavbar />
        <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-2xl mx-auto px-[2cm] py-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] overflow-hidden pb-20 lg:pb-0">
        <FacebookNavbar />
        <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-2xl mx-auto px-[2cm] py-20">
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">😕</span>
              </div>
               <h2 className="text-2xl font-bold mb-3">{t('postNotFound')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('postNotFoundDesc')}
              </p>
              <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90">
                <Home className="w-4 h-4 mr-2" />
                {t('backToHome')}
              </Button>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] overflow-hidden pb-20 lg:pb-0">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-[2cm] py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('goBack')}
          </Button>

          <FacebookPostCard
            post={post}
            currentUserId={currentUserId}
            onPostDeleted={() => navigate('/')}
          />

          <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-lg mb-4">{t('relatedPosts')}</h3>
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('featureInDevelopment')}</p>
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Post;
