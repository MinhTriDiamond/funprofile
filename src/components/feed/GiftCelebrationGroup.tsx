import { memo } from 'react';
import { GiftCelebrationCard } from './GiftCelebrationCard';
import { Gift } from 'lucide-react';

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
  if (posts.length === 0) return null;

  const showScrollable = posts.length > 3;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
        <Gift className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-foreground">Gift Celebration</span>
        {showScrollable && (
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {posts.length} gifts · cuộn để xem thêm
          </span>
        )}
      </div>

      {/* Scrollable container */}
      <div
        className={showScrollable ? 'max-h-[1200px] overflow-y-auto scrollbar-thin' : ''}
        style={showScrollable ? { scrollBehavior: 'smooth' } : undefined}
      >
        <div className="p-2 space-y-2">
          {posts.map(post => (
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
