import { memo, useState, useCallback } from 'react';
import { GiftCelebrationCard } from './GiftCelebrationCard';
import { GiftHistoryCalendar } from './GiftHistoryCalendar';
import { Gift, Volume2, VolumeX, ChevronDown, Loader2 } from 'lucide-react';
import { stopCelebrationMusic } from '@/lib/celebrationSounds';
import { useGiftHistory, getTodayVN } from '@/hooks/useGiftHistory';

interface GiftCelebrationGroupProps {
  posts: any[];
  currentUserId: string;
  onPostDeleted: () => void;
  postStats: Record<string, any>;
}

const INITIAL_VISIBLE = 3;
const LOAD_MORE_COUNT = 3;

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
  const [selectedDate, setSelectedDate] = useState<string>(getTodayVN());

  const { dateCounts, donationCount, historyPosts, historyPostStats, isLoadingHistory, isToday } = useGiftHistory(selectedDate);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('celebration_muted', String(next));
      if (next) stopCelebrationMusic();
      return next;
    });
  }, []);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setVisibleCount(INITIAL_VISIBLE);
  }, []);

  // Choose data source: today → live props, other days → history query
  const activePosts = isToday ? posts : historyPosts;
  const activeStats = isToday ? postStats : historyPostStats;

  if (posts.length === 0 && isToday) return null;

  const sortedPosts = [...activePosts].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const visiblePosts = sortedPosts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedPosts.length;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-pink-600" />
          <span className="text-sm font-semibold text-foreground">Gift Celebration</span>
        </div>

        <button
          onClick={toggleMute}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Volume2 className="w-4 h-4 text-pink-600" />
          )}
        </button>

        <GiftHistoryCalendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          dateCounts={dateCounts}
        />

        <span className="text-xs text-pink-600 font-semibold bg-pink-600/10 px-2 py-0.5 rounded-full">
          {donationCount} gifts
        </span>
      </div>


      {/* Posts */}
      <div>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">Không có gift nào trong ngày này</span>
          </div>
        ) : (
          <>
            <div className="p-2 space-y-2">
              {visiblePosts.map(post => (
                <GiftCelebrationCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onPostDeleted={onPostDeleted}
                  initialStats={activeStats[post.id]}
                />
              ))}
            </div>

            <div className="px-4 pb-3 pt-1 flex flex-col gap-1">
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-pink-600 hover:text-pink-700 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Xem thêm ({sortedPosts.length - visibleCount} gifts)
                </button>
              )}
              {visibleCount > INITIAL_VISIBLE && (
                <button
                  onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-pink-600 hover:text-pink-700 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  Thu gọn
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const GiftCelebrationGroup = memo(GiftCelebrationGroupComponent);
GiftCelebrationGroup.displayName = 'GiftCelebrationGroup';
