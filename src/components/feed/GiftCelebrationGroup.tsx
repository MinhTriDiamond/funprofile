import { memo, useState, useCallback } from 'react';
import { GiftCelebrationCard } from './GiftCelebrationCard';
import { Gift, Volume2, VolumeX, ChevronDown } from 'lucide-react';

interface GiftCelebrationGroupProps {
  posts: any[];
  currentUserId: string;
  onPostDeleted: () => void;
  postStats: Record<string, any>;
}

const INITIAL_VISIBLE = 5;
const LOAD_MORE_COUNT = 5;

const GiftCelebrationGroupComponent = ({
  posts,
  currentUserId,
  onPostDeleted,
  postStats,
}: GiftCelebrationGroupProps) => {
  const [isMuted, setIsMuted] = useState(() => 
    localStorage.getItem('celebration_muted') === 'true'
  );
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('celebration_muted', String(next));
      return next;
    });
  }, []);

  if (posts.length === 0) return null;

  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const visiblePosts = sortedPosts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedPosts.length;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
        <Gift className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-foreground">Gift Celebration</span>
        
        <button
          onClick={toggleMute}
          className="ml-2 p-1 rounded-md hover:bg-muted transition-colors"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-500" />
          )}
        </button>

        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {posts.length} gifts
        </span>
      </div>

      {/* Scrollable container */}
      <div
        className="max-h-[750px] overflow-y-auto scrollbar-thin"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="p-2 space-y-2">
          {visiblePosts.map(post => (
            <GiftCelebrationCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostDeleted={onPostDeleted}
              initialStats={postStats[post.id]}
            />
          ))}
        </div>

        {hasMore && (
          <div className="px-4 pb-3 pt-1">
            <button
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Xem thêm ({sortedPosts.length - visibleCount} gifts)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const GiftCelebrationGroup = memo(GiftCelebrationGroupComponent);
GiftCelebrationGroup.displayName = 'GiftCelebrationGroup';
