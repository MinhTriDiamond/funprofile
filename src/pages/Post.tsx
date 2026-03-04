import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSlugResolver } from '@/hooks/useSlugResolver';
import { SEOHead, buildArticleJsonLd } from '@/components/seo/SEOHead';

interface PostProfileData {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
  public_wallet_address: string | null;
}

interface PostWithProfile {
  id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  media_urls: Array<{ url: string; type: 'image' | 'video' }> | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  visibility: string | null;
  slug: string | null;
  profiles: PostProfileData;
  reactions: Array<{ id: string; user_id: string; type: string }>;
  comments: Array<{ id: string }>;
}

const Post = () => {
  const { postId, username, slug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { userId } = useCurrentUser();
  const [post, setPost] = useState<PostWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { resolvedId, loading: slugLoading } = useSlugResolver({
    contentType: 'post',
    table: 'posts',
    userIdColumn: 'user_id',
    directId: postId,
    username,
    slug,
    urlPrefix: 'post',
  });

  useEffect(() => {
    const fetchPost = async () => {
      if (slugLoading) return;
      if (!resolvedId) {
        setPost(null);
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address),
          reactions (id, user_id, type),
          comments (id)
        `)
        .eq('id', resolvedId)
        .maybeSingle();

      if (error || !data) {
        setPost(null);
      } else {
        setPost(data as unknown as PostWithProfile);
      }
      setLoading(false);
    };

    fetchPost();
  }, [resolvedId, slugLoading]);

  // SEO data
  const seoData = useMemo(() => {
    if (!post) return null;
    const authorName = post.profiles?.display_name || post.profiles?.username || 'FUN User';
    const postContent = (post.content || '').slice(0, 155);
    const postUsername = post.profiles?.username;
    const canonicalPath = postUsername && post.slug
      ? `/${postUsername}/post/${post.slug}`
      : `/post/${post.id}`;
    const firstMediaImage = Array.isArray(post.media_urls)
      ? post.media_urls.find((m) => m.type === 'image')?.url
      : null;
    return {
      title: `${authorName} - Post`,
      description: postContent || `Post by ${authorName} on FUN Profile`,
      canonicalPath,
      image: post.image_url || firstMediaImage || null,
      jsonLd: buildArticleJsonLd({
        title: `Post by ${authorName}`,
        description: postContent,
        url: `https://fun.rich${canonicalPath}`,
        image: post.image_url || firstMediaImage || null,
        authorName,
        datePublished: post.created_at,
      }),
    };
  }, [post]);

  if (loading || slugLoading) {
    return (
      <div className="min-h-screen bg-background overflow-hidden pb-20 lg:pb-0">
        <FacebookNavbar />
        <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background overflow-hidden pb-20 lg:pb-0">
        <FacebookNavbar />
        <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-20">
            <div className="bg-card rounded-xl shadow-sm p-8 sm:p-12 text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">😕</span>
              </div>
               <h2 className="text-2xl font-bold mb-3">{t('postNotFound')}</h2>
              <p className="text-muted-foreground mb-6">{t('postNotFoundDesc')}</p>
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
    <div className="min-h-screen bg-background overflow-hidden pb-20 lg:pb-0">
      {seoData && (
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          canonicalPath={seoData.canonicalPath}
          image={seoData.image}
          ogType="article"
          jsonLd={seoData.jsonLd}
        />
      )}
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
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
            currentUserId={userId || ''}
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
