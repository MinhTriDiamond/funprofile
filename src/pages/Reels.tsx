import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useSlugResolver } from '@/hooks/useSlugResolver';

const ReelsFeed = lazy(() => import('@/components/reels/ReelsFeed'));

const ReelsLoader = () => (
  <div className="flex items-center justify-center h-screen bg-black">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Reels = () => {
  const { reelId, username, slug } = useParams<{ reelId?: string; username?: string; slug?: string }>();

  const { resolvedId } = useSlugResolver({
    contentType: 'reel',
    table: 'reels',
    userIdColumn: 'user_id',
    directId: reelId,
    username,
    slug,
    urlPrefix: 'video',
  });

  return (
    <div className="min-h-screen bg-black">
      <FacebookNavbar />
      <main className="fixed inset-x-0 top-[3cm] bottom-0 lg:pb-0 pb-[72px]">
        <Suspense fallback={<ReelsLoader />}>
          <ReelsFeed initialReelId={resolvedId} />
        </Suspense>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Reels;
