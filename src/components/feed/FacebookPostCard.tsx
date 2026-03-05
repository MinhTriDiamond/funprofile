import { useState, useCallback, useRef, memo } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getAbsolutePostUrl } from '@/lib/slug';
import { extractPostStreamVideos, deleteStreamVideos, isSupabaseStorageUrl, deleteStorageFile } from '@/utils/streamHelpers';
import { usePostStats } from '@/hooks/usePostStats';
import { PostHeader } from './PostHeader';
import { PostMedia } from './PostMedia';
import { PostFooter } from './PostFooter';
import { ExpandableContent } from './ExpandableContent';
import { CommentSection } from './CommentSection';
import { ImageViewer } from './ImageViewer';
import { EditPostDialog } from './EditPostDialog';
import { ShareDialog } from './ShareDialog';
import { LiveChatReplay } from '@/modules/live/components/LiveChatReplay';
import { LinkPreviewCard, extractFirstUrl } from './LinkPreviewCard';
import type { FacebookPostCardProps } from './types';

const FacebookPostCardComponent = ({
  post, currentUserId, onPostDeleted, initialStats,
  isPinned = false, onPinPost, onUnpinPost,
  isOwnProfile = false, viewAsPublic = false,
  disableRealtime = false,
}: FacebookPostCardProps) => {
  const { t } = useLanguage();
  const canShowPinOption = isOwnProfile && !viewAsPublic && post.user_id === currentUserId;
  const hasNativeMedia = !!(post.image_url || post.video_url || (post.media_urls && post.media_urls.length > 0));
  const firstUrl = !hasNativeMedia && post.content ? extractFirstUrl(post.content) : null;

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastTapRef = useRef<number>(0);

  const {
    likeCount, commentCount, shareCount,
    currentReaction, reactionCounts,
    handleReactionChange, incrementCommentCount, setShareCount,
  } = usePostStats(post.id, currentUserId, initialStats, disableRealtime);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      toast.success(t('postDeleted'));
      onPostDeleted();
      // Background cleanup
      const videoUrls = extractPostStreamVideos(post);
      if (videoUrls.length > 0) deleteStreamVideos(videoUrls).catch(() => {});
      if (post.video_url && isSupabaseStorageUrl(post.video_url)) deleteStorageFile(post.video_url).catch(() => {});
    } catch {
      toast.error(t('cannotDeletePost'));
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, post, onPostDeleted, t]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(getAbsolutePostUrl(post));
    toast.success(t('linkCopied'));
  }, [post, t]);

  const toggleComments = useCallback(() => setShowComments((p) => !p), []);

  const handleMediaDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !currentReaction) {
      setShowHeartAnimation(true);
    }
    lastTapRef.current = now;
  }, [currentReaction]);

  return (
    <>
      <div className="fb-card mb-3 sm:mb-4 overflow-hidden">
        <PostHeader
          post={post}
          currentUserId={currentUserId}
          isPinned={isPinned}
          canShowPinOption={canShowPinOption}
          isDeleting={isDeleting}
          onCopyLink={handleCopyLink}
          onEdit={() => setShowEditDialog(true)}
          onDelete={handleDelete}
          onPinPost={onPinPost}
          onUnpinPost={onUnpinPost}
        />

        {post.content && (
          <div className="px-4 pb-3">
            <ExpandableContent content={post.content} maxLength={300} maxLines={5} />
          </div>
        )}

        <PostMedia
          post={post}
          showHeartAnimation={showHeartAnimation}
          onHeartComplete={() => setShowHeartAnimation(false)}
          onDoubleTap={handleMediaDoubleTap}
        />

        {firstUrl && <LinkPreviewCard url={firstUrl} />}

        <PostFooter
          post={post}
          currentUserId={currentUserId}
          likeCount={likeCount}
          commentCount={commentCount}
          shareCount={shareCount}
          currentReaction={currentReaction}
          reactionCounts={reactionCounts}
          onToggleComments={toggleComments}
          onReactionChange={handleReactionChange}
          onShareClick={() => setShowShareDialog(true)}
        />

        {showComments && (
          <div className="border-t border-border px-4 py-3">
            {post.post_type === 'live' && post.metadata?.live_session_id && (
              <div className="max-h-[300px] rounded-lg overflow-hidden border border-border mb-3">
                <LiveChatReplay sessionId={post.metadata.live_session_id} />
              </div>
            )}
            <CommentSection postId={post.id} onCommentAdded={incrementCommentCount} disableRealtime={disableRealtime} />
          </div>
        )}
      </div>

      <ImageViewer imageUrl={post.image_url || ''} isOpen={showImageViewer} onClose={() => setShowImageViewer(false)} />
      <EditPostDialog post={post} isOpen={showEditDialog} onClose={() => setShowEditDialog(false)} onPostUpdated={onPostDeleted} />
      <ShareDialog
        open={showShareDialog} onOpenChange={setShowShareDialog}
        post={post} currentUserId={currentUserId}
        onShareComplete={() => setShareCount((p) => p + 1)}
      />
    </>
  );
};

export const FacebookPostCard = memo(FacebookPostCardComponent, (prev, next) => (
  prev.post.id === next.post.id &&
  prev.post.content === next.post.content &&
  prev.post.image_url === next.post.image_url &&
  prev.post.video_url === next.post.video_url &&
  prev.currentUserId === next.currentUserId &&
  prev.initialStats?.commentCount === next.initialStats?.commentCount &&
  prev.initialStats?.shareCount === next.initialStats?.shareCount &&
  prev.initialStats?.reactions?.length === next.initialStats?.reactions?.length &&
  prev.isPinned === next.isPinned &&
  prev.isOwnProfile === next.isOwnProfile &&
  prev.viewAsPublic === next.viewAsPublic &&
  prev.disableRealtime === next.disableRealtime
));
