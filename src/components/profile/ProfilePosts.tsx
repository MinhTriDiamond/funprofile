import { useCallback } from 'react';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { GiftCelebrationCard } from '@/components/feed/GiftCelebrationCard';
import { FacebookCreatePost } from '@/components/feed/FacebookCreatePost';
import { Button } from '@/components/ui/button';
import { Pin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import type { PostStats } from '@/hooks/useFeedPosts';
import type { ProfileData } from '@/hooks/useProfile';

interface ProfilePostsProps {
  profile: ProfileData;
  currentUserId: string;
  showPrivateElements: boolean;
  isOwnProfile: boolean;
  viewAsPublic: boolean;
  displayedPosts: any[];
  hasMorePosts: boolean;
  sortedPostsLength: number;
  displayedCount: number;
  POSTS_PER_PAGE: number;
  onSetDisplayedCount: (updater: (prev: number) => number) => void;
  onSetProfile: (updater: (prev: ProfileData | null) => ProfileData | null) => void;
  buildInitialStats: (post: any) => PostStats | undefined;
  onRefresh: () => void;
}

export const ProfilePosts = ({
  profile,
  currentUserId,
  showPrivateElements,
  isOwnProfile,
  viewAsPublic,
  displayedPosts,
  hasMorePosts,
  sortedPostsLength,
  displayedCount,
  POSTS_PER_PAGE,
  onSetDisplayedCount,
  onSetProfile,
  buildInitialStats,
  onRefresh,
}: ProfilePostsProps) => {
  const { t } = useLanguage();

  const handlePinPost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ pinned_post_id: postId }).eq('id', currentUserId);
      if (error) throw error;
      onSetProfile(prev => prev ? { ...prev, pinned_post_id: postId } : prev);
      toast.success(t('postPinned'));
    } catch {
      toast.error(t('cannotPinPost'));
    }
  }, [currentUserId, onSetProfile, t]);

  const handleUnpinPost = useCallback(async () => {
    try {
      const { error } = await supabase.from('profiles').update({ pinned_post_id: null }).eq('id', currentUserId);
      if (error) throw error;
      onSetProfile(prev => prev ? { ...prev, pinned_post_id: null } : prev);
      toast.success(t('postUnpinned'));
    } catch {
      toast.error(t('cannotUnpinPost'));
    }
  }, [currentUserId, onSetProfile, t]);

  return (
    <div className="space-y-4">
      {showPrivateElements && currentUserId && (
        <FacebookCreatePost onPostCreated={onRefresh} />
      )}
      
      {displayedPosts.length === 0 ? (
        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-8 text-center text-muted-foreground">
          {t('noPostsYet')}
        </div>
      ) : (
        <>
          {displayedPosts.map((item) => {
            const isPinned = item._type === 'original' && item.id === profile?.pinned_post_id;
            const stats = item._type === 'original' ? buildInitialStats(item) : undefined;
            const sharedStats = item._type === 'shared' && item.posts ? buildInitialStats(item.posts) : undefined;

            return item._type === 'shared' ? (
              <div key={`shared-${item.id}`} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                  <span className="font-semibold text-primary">{t('sharedLabel')}</span>
                </div>
                {item.caption && <p className="text-sm text-muted-foreground italic px-3 pb-1">{item.caption}</p>}
                <FacebookPostCard post={item.posts} currentUserId={currentUserId} onPostDeleted={onRefresh} initialStats={sharedStats} />
              </div>
            ) : (
              <div key={item.id} className="space-y-0">
                {isPinned && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-secondary/50 rounded-t-xl border-b border-border">
                    <Pin className="w-4 h-4 text-primary" /><span className="font-medium">{t('pinnedPost')}</span>
                  </div>
                )}
                {item.post_type === 'gift_celebration' ? (
                  <GiftCelebrationCard post={item} currentUserId={currentUserId} onPostDeleted={onRefresh} initialStats={stats} />
                ) : (
                  <FacebookPostCard
                    post={item}
                    currentUserId={currentUserId}
                    onPostDeleted={onRefresh}
                    initialStats={stats}
                    isPinned={isPinned}
                    onPinPost={showPrivateElements ? handlePinPost : undefined}
                    onUnpinPost={showPrivateElements ? handleUnpinPost : undefined}
                    isOwnProfile={isOwnProfile}
                    viewAsPublic={viewAsPublic}
                  />
                )}
              </div>
            );
          })}
          {hasMorePosts && (
            <div className="flex justify-center py-4">
              <Button variant="secondary" onClick={() => onSetDisplayedCount(prev => prev + POSTS_PER_PAGE)} className="w-full max-w-md">
                Xem thêm ({sortedPostsLength - displayedCount} bài còn lại)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
