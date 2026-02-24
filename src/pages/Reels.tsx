import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const ReelsFeed = lazy(() => import('@/components/reels/ReelsFeed'));

const ReelsLoader = () => (
  <div className="flex items-center justify-center h-screen bg-black">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Reels = () => {
  const { reelId, username, slug } = useParams<{ reelId?: string; username?: string; slug?: string }>();
  const [resolvedReelId, setResolvedReelId] = useState<string | undefined>(reelId);

  // Resolve slug-based URL to reel ID
  useEffect(() => {
    if (reelId) {
      setResolvedReelId(reelId);
      return;
    }
    if (!username || !slug) {
      setResolvedReelId(undefined);
      return;
    }

    const resolveSlug = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (!profile) return;

      const { data: reel } = await supabase
        .from('reels')
        .select('id')
        .eq('user_id', profile.id)
        .eq('slug', slug)
        .maybeSingle();

      if (reel) setResolvedReelId(reel.id);
    };

    resolveSlug();
  }, [reelId, username, slug]);

  return (
    <div className="min-h-screen bg-black">
      <FacebookNavbar />
      <main className="fixed inset-x-0 top-[3cm] bottom-0 lg:pb-0 pb-[72px]">
        <Suspense fallback={<ReelsLoader />}>
          <ReelsFeed initialReelId={resolvedReelId} />
        </Suspense>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Reels;
