import { memo, useState, useCallback } from 'react';
import { GiftCelebrationCard } from './GiftCelebrationCard';
import { Gift, Volume2, VolumeX } from 'lucide-react';
import { stopCelebrationMusic } from '@/lib/celebrationSounds';

interface GiftCelebrationGroupProps {
  posts: any[];
  currentUserId: string;
  onPostDeleted: () => void;
  postStats: Record<string, any>;
}

const GiftCelebrationGroupComponent = ({
  posts,
  currentUserId,
  onPostDeleted,
  postStats,
}: GiftCelebrationGroupProps) => {
  const [isMuted, setIsMuted] = useState(() => 
    localStorage.getItem('celebration_muted') === 'true'
  );

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('celebration_muted', String(next));

      if (next) {
        stopCelebrationMusic();
      }

      return next;
    });
  }, []);

  if (posts.length === 0) return null;

  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
          {posts.length} gifts{posts.length > 3 ? ' · cuộn để xem thêm' : ''}
        </span>
      </div>

      {/* Scrollable container */}
      <div
        className="max-h-[750px] overflow-y-auto scrollbar-thin"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="p-2 space-y-2">
          {sortedPosts.map(post => (
            <GiftCelebrationCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostDeleted={onPostDeleted}
              initialStats={postStats[post.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const GiftCelebrationGroup = memo(GiftCelebrationGroupComponent);
GiftCelebrationGroup.displayName = 'GiftCelebrationGroup';
