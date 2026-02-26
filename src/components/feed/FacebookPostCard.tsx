import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAbsolutePostUrl } from '@/lib/slug';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';
import { CommentSection } from './CommentSection';
import { ImageViewer } from './ImageViewer';
import { EditPostDialog } from './EditPostDialog';
import { ReactionButton } from './ReactionButton';
import { ReactionSummary } from './ReactionSummary';
import { MediaGrid } from './MediaGrid';
import { LivePostEmbed } from './LivePostEmbed';
import { ExpandableContent } from './ExpandableContent';
import { HeartAnimation } from './HeartAnimation';
import { ShareDialog } from './ShareDialog';
import { extractPostStreamVideos, deleteStreamVideos, isSupabaseStorageUrl, deleteStorageFile } from '@/utils/streamHelpers';
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  Trash2,
  Pencil,
  Link2,
  Bookmark,
  Pin,
  PinOff,
  Users,
  Lock,
  Radio,
} from 'lucide-react';
import { DonationButton } from '@/components/donations/DonationButton';
import { LiveChatReplay } from '@/modules/live/components/LiveChatReplay';

interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

interface FacebookPostCardProps {
  post: {
    id: string;
    slug?: string | null;
    content: string;
    image_url: string | null;
    video_url?: string | null;
    media_urls?: Array<{ url: string; type: 'image' | 'video' }> | null;
    created_at: string;
    user_id: string;
    visibility?: string;
    profiles: {
      username: string;
      display_name?: string | null;
      avatar_url: string | null;
      public_wallet_address?: string | null;
    };
  };
  currentUserId: string;
  onPostDeleted: () => void;
  initialStats?: PostStats;
  isPinned?: boolean;
  onPinPost?: (postId: string) => void;
  onUnpinPost?: () => void;
  isOwnProfile?: boolean;
  viewAsPublic?: boolean;
}

interface ReactionCount {
  type: string;
  count: number;
}

const FacebookPostCardComponent = ({ 
  post, 
  currentUserId, 
  onPostDeleted, 
  initialStats,
  isPinned = false,
  onPinPost,
  onUnpinPost,
  isOwnProfile = false,
  viewAsPublic = false,
}: FacebookPostCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Show pin options only on own profile, when not in View As mode, and for user's own posts
  const canShowPinOption = isOwnProfile && !viewAsPublic && post.user_id === currentUserId;
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [commentCount, setCommentCount] = useState(initialStats?.commentCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [shareCount, setShareCount] = useState(initialStats?.shareCount || 0);
  const [likeCount, setLikeCount] = useState(initialStats?.reactions?.length || 0);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>([]);
  const [isStatsLoaded, setIsStatsLoaded] = useState(!!initialStats);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Helper function to process reactions data
  const processReactions = (reactions: { id: string; user_id: string; type: string }[]) => {
    setLikeCount(reactions.length);
    
    // Get current user's reaction
    const userReaction = reactions.find((r) => r.user_id === currentUserId);
    setCurrentReaction(userReaction?.type || null);

    // Count reactions by type
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    setReactionCounts(
      Object.entries(counts).map(([type, count]) => ({ type, count }))
    );
  };

  // Initialize from pre-fetched stats OR fetch individually if not available
  useEffect(() => {
    if (initialStats) {
      processReactions(initialStats.reactions);
      setCommentCount(initialStats.commentCount);
      setShareCount(initialStats.shareCount);
      setIsStatsLoaded(true);
    } else if (!isStatsLoaded) {
      // Fallback: fetch this post's stats individually
      const fetchStats = async () => {
        try {
          const [reactionsRes, commentsRes, sharesRes] = await Promise.all([
            supabase
              .from('reactions')
              .select('id, user_id, type')
              .eq('post_id', post.id)
              .is('comment_id', null),
            supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('shared_posts')
              .select('*', { count: 'exact', head: true })
              .eq('original_post_id', post.id),
          ]);

          if (reactionsRes.data) {
            processReactions(reactionsRes.data);
          }
          setCommentCount(commentsRes.count || 0);
          setShareCount(sharesRes.count || 0);
          setIsStatsLoaded(true);
        } catch (error) {
          console.error('Error fetching post stats:', error);
        }
      };
      fetchStats();
    }
  }, [initialStats, currentUserId, post.id, isStatsLoaded]);

  // Only subscribe to realtime for updates (not initial fetch)
  useEffect(() => {
    const handleRealtimeUpdate = async () => {
      // Refetch only this post's data on realtime update
      const { data: reactions } = await supabase
        .from('reactions')
        .select('id, user_id, type')
        .eq('post_id', post.id)
        .is('comment_id', null);

      if (reactions) {
        setLikeCount(reactions.length);
        const userReaction = reactions.find((r) => r.user_id === currentUserId);
        setCurrentReaction(userReaction?.type || null);

        const counts: Record<string, number> = {};
        reactions.forEach((r) => {
          counts[r.type] = (counts[r.type] || 0) + 1;
        });
        setReactionCounts(
          Object.entries(counts).map(([type, count]) => ({ type, count }))
        );
      }

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setCommentCount(commentsCount || 0);

      const { count: sharesCount } = await supabase
        .from('shared_posts')
        .select('*', { count: 'exact', head: true })
        .eq('original_post_id', post.id);
      setShareCount(sharesCount || 0);
    };

    const channel = supabase
      .channel(`post-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `post_id=eq.${post.id}`,
        },
        handleRealtimeUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`,
        },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, currentUserId]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      // Delete DB record FIRST for instant UI update
      const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
      if (deleteError) throw deleteError;
      
      toast.success(t('postDeleted'));
      onPostDeleted();

      // Background cleanup — don't block UI
      const videoUrls = extractPostStreamVideos(post);
      if (videoUrls.length > 0) {
        deleteStreamVideos(videoUrls).catch(err => console.warn('[POST] Background video cleanup failed:', err));
      }
      if (post.video_url && isSupabaseStorageUrl(post.video_url)) {
        deleteStorageFile(post.video_url).catch(err => console.warn('[POST] Background storage cleanup failed:', err));
      }
    } catch (error: unknown) {
      toast.error(t('cannotDeletePost'));
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, post, onPostDeleted, t]);

  const handleCopyLink = useCallback(() => {
    const url = getAbsolutePostUrl(post);
    navigator.clipboard.writeText(url);
    toast.success(t('linkCopied'));
  }, [post, t]);


  const handleReactionChange = useCallback((newCount: number, newReaction: string | null) => {
    setLikeCount(newCount);
    setCurrentReaction(newReaction);
  }, []);

  const toggleComments = useCallback(() => {
    setShowComments((prev) => !prev);
  }, []);

  // Double-tap to like on media
  const handleMediaDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!currentReaction) {
        // Trigger like
        setShowHeartAnimation(true);
      }
    }
    lastTapRef.current = now;
  }, [currentReaction]);

  const openEditDialog = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setShowEditDialog(false);
  }, []);

  const closeImageViewer = useCallback(() => {
    setShowImageViewer(false);
  }, []);

  const incrementCommentCount = useCallback(() => {
    setCommentCount((prev) => prev + 1);
  }, []);

  // Prepare media items for MediaGrid - memoized
  const mediaItems = useMemo(() => {
    const items: Array<{ url: string; type: 'image' | 'video'; poster?: string; isLiveReplay?: boolean }> = [];
    const metadata = (post as any).metadata;
    const isLive = (post as any).post_type === 'live';
    
    if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      // Tag live replay media items
      if (isLive) {
        return post.media_urls.map(m => ({
          ...m,
          isLiveReplay: m.type === 'video',
          poster: m.type === 'video' ? metadata?.thumbnail_url : undefined,
        }));
      }
      return post.media_urls;
    }
    
    if (post.image_url) {
      items.push({ url: post.image_url, type: 'image' as const });
    }
    if (post.video_url) {
      const poster = metadata?.thumbnail_url as string | undefined;
      items.push({ url: post.video_url, type: 'video' as const, poster, isLiveReplay: isLive });
    }
    return items;
  }, [post.media_urls, post.image_url, post.video_url, (post as any).metadata, (post as any).post_type]);

  return (
    <>
      <div className="fb-card mb-3 sm:mb-4 overflow-hidden">
        {/* Post Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar
              className="w-10 h-10 cursor-pointer ring-2 ring-primary/20"
              onClick={() => navigate(`/profile/${post.user_id}`)}
            >
              <AvatarImage src={post.profiles?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.profiles?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3
                className="font-semibold cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${post.user_id}`)}
              >
                {post.profiles?.display_name || post.profiles?.username}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
                <span>·</span>
                {post.visibility === 'private' ? (
                  <Lock className="w-3 h-3" />
                ) : post.visibility === 'friends' ? (
                  <Users className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem className="cursor-pointer gap-3">
                <Bookmark className="w-5 h-5" />
                {t('savePost')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-3">
                <Link2 className="w-5 h-5" />
                {t('copyLink')}
              </DropdownMenuItem>
              {/* Pin/Unpin options - only on own profile */}
              {canShowPinOption && (
                isPinned ? (
                  <DropdownMenuItem
                    onClick={onUnpinPost}
                    className="cursor-pointer gap-3"
                  >
                    <PinOff className="w-5 h-5" />
                    {t('unpinPost')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onPinPost?.(post.id)}
                    className="cursor-pointer gap-3"
                  >
                    <Pin className="w-5 h-5" />
                    {t('pinPost')}
                  </DropdownMenuItem>
                )
              )}
              {post.user_id === currentUserId && (
                <>
                  <DropdownMenuItem
                    onClick={openEditDialog}
                    className="cursor-pointer gap-3"
                  >
                    <Pencil className="w-5 h-5" />
                    {t('editPost')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="cursor-pointer text-destructive gap-3"
                  >
                    <Trash2 className="w-5 h-5" />
                    {isDeleting ? t('deleting') : t('deletePost')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <ExpandableContent content={post.content} maxLength={300} maxLines={5} />
          </div>
        )}

        {/* Post Media */}
        {(post as any).post_type === 'live' && (post as any).metadata?.live_status === 'live' ? (
          <LivePostEmbed
            metadata={(post as any).metadata}
            hostName={post.profiles?.display_name || post.profiles?.username || ''}
          />
        ) : (
          <div className="relative" onClick={handleMediaDoubleTap}>
            {mediaItems.length > 0 ? (
              <MediaGrid media={mediaItems} />
        ) : (post as any).post_type === 'live' && (post as any).metadata?.live_status === 'ended' ? (
              (post as any).metadata?.recording_failed ? (
                <div className="flex items-center justify-center p-6 bg-muted/50 text-muted-foreground text-sm gap-2">
                  <Radio className="w-4 h-4" />
                  <span>Phiên live này không có bản ghi</span>
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 bg-muted/50 text-muted-foreground text-sm gap-2">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Đang xử lý bản ghi livestream...</span>
                </div>
              )
            ) : null}
            <HeartAnimation show={showHeartAnimation} onComplete={() => setShowHeartAnimation(false)} />
          </div>
        )}

        {/* Reactions Summary */}
        <ReactionSummary
          postId={post.id}
          reactions={reactionCounts}
          totalCount={likeCount}
          commentCount={commentCount}
          shareCount={shareCount}
          onCommentClick={toggleComments}
        />

        {/* Action Buttons */}
        <div className="border-t border-border mx-2 sm:mx-4">
          <div className="flex items-center py-1">
            <ReactionButton
              postId={post.id}
              currentUserId={currentUserId}
              initialReaction={currentReaction}
              likeCount={likeCount}
              onReactionChange={handleReactionChange}
            />

            <button
              onClick={toggleComments}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80"
            >
              <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">{t('comment')}</span>
            </button>

            <button
              onClick={() => setShowShareDialog(true)}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80"
            >
              <Share2 className="w-5 h-5 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">{t('share')}</span>
            </button>

            {/* Donation Button - only show for other users' posts */}
            {post.user_id !== currentUserId && (
              <DonationButton
                recipientId={post.user_id}
                recipientUsername={post.profiles?.username || 'Unknown'}
                recipientDisplayName={post.profiles?.display_name}
                recipientWalletAddress={post.profiles?.public_wallet_address}
                recipientAvatarUrl={post.profiles?.avatar_url}
                postId={post.id}
                variant="post"
              />
            )}
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border px-4 py-3">
            {(post as any).post_type === 'live' && (post as any).metadata?.live_session_id && (
              <div className="max-h-[300px] rounded-lg overflow-hidden border border-border mb-3">
                <LiveChatReplay sessionId={(post as any).metadata.live_session_id} />
              </div>
            )}
            <CommentSection
              postId={post.id}
              onCommentAdded={incrementCommentCount}
            />
          </div>
        )}
      </div>

      <ImageViewer
        imageUrl={post.image_url || ''}
        isOpen={showImageViewer}
        onClose={closeImageViewer}
      />

      <EditPostDialog
        post={post}
        isOpen={showEditDialog}
        onClose={closeEditDialog}
        onPostUpdated={onPostDeleted}
      />

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        post={post}
        currentUserId={currentUserId}
        onShareComplete={() => setShareCount((prev) => prev + 1)}
      />
    </>
  );
};

// Memoized export with custom comparison
export const FacebookPostCard = memo(FacebookPostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.image_url === nextProps.post.image_url &&
    prevProps.post.video_url === nextProps.post.video_url &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.initialStats?.commentCount === nextProps.initialStats?.commentCount &&
    prevProps.initialStats?.shareCount === nextProps.initialStats?.shareCount &&
    prevProps.initialStats?.reactions?.length === nextProps.initialStats?.reactions?.length &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isOwnProfile === nextProps.isOwnProfile &&
    prevProps.viewAsPublic === nextProps.viewAsPublic
  );
});
