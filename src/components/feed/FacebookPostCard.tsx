import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { CommentSection } from './CommentSection';
import { ImageViewer } from './ImageViewer';
import { EditPostDialog } from './EditPostDialog';
import { ReactionButton } from './ReactionButton';
import { ReactionSummary } from './ReactionSummary';
import { MediaGrid } from './MediaGrid';
import { ExpandableContent } from './ExpandableContent';
import { extractStreamUid, isStreamUrl } from '@/utils/streamUpload';
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  Trash2,
  Pencil,
  Link2,
  Bookmark,
} from 'lucide-react';

// Helper to delete Cloudflare Stream video - returns true if successful
const deleteStreamVideo = async (videoUrl: string): Promise<boolean> => {
  const uid = extractStreamUid(videoUrl);
  if (!uid) {
    console.warn('[FacebookPostCard] Could not extract UID from URL:', videoUrl);
    return false;
  }
  
  try {
    console.log('[FacebookPostCard] Deleting Stream video:', uid);
    const { data, error } = await supabase.functions.invoke('stream-video', {
      body: { action: 'delete', uid },
    });
    
    if (error) {
      console.error('[FacebookPostCard] Stream video delete error:', error);
      return false;
    }
    
    console.log('[FacebookPostCard] Stream video deleted successfully:', uid, data);
    return true;
  } catch (error) {
    console.error('[FacebookPostCard] Failed to delete Stream video:', error);
    return false;
  }
};

interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

interface FacebookPostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    video_url?: string | null;
    media_urls?: Array<{ url: string; type: 'image' | 'video' }> | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
  onPostDeleted: () => void;
  initialStats?: PostStats; // Pre-fetched stats from parent
}

interface ReactionCount {
  type: string;
  count: number;
}

export const FacebookPostCard = ({ post, currentUserId, onPostDeleted, initialStats }: FacebookPostCardProps) => {
  const navigate = useNavigate();
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

  const handleDelete = async () => {
    // Prevent multiple clicks
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      // Collect all video URLs from this post
      const videoUrls: string[] = [];
      
      // Check legacy video_url
      if (post.video_url && isStreamUrl(post.video_url)) {
        videoUrls.push(post.video_url);
      }
      
      // Check media_urls for videos
      if (post.media_urls && Array.isArray(post.media_urls)) {
        post.media_urls.forEach((media) => {
          if (media.type === 'video' && isStreamUrl(media.url)) {
            videoUrls.push(media.url);
          }
        });
      }
      
      // Delete all videos from CF Stream first (in parallel)
      if (videoUrls.length > 0) {
        console.log('[FacebookPostCard] Deleting', videoUrls.length, 'videos from CF Stream');
        const results = await Promise.all(videoUrls.map(deleteStreamVideo));
        const successCount = results.filter(Boolean).length;
        console.log('[FacebookPostCard] Deleted', successCount, 'of', videoUrls.length, 'videos');
      }
      
      // Now delete the post from database
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      
      toast.success('Đã xóa bài viết');
      onPostDeleted();
    } catch (error: unknown) {
      console.error('[FacebookPostCard] Delete error:', error);
      toast.error('Không thể xóa bài viết');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép link!');
  };

  const handleShareToProfile = async () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để chia sẻ');
      return;
    }

    try {
      const { error } = await supabase.from('shared_posts').insert({
        user_id: currentUserId,
        original_post_id: post.id,
      });

      if (error) throw error;
      setShareCount((prev) => prev + 1);
      toast.success('Đã chia sẻ bài viết!');
    } catch (error: any) {
      toast.error('Không thể chia sẻ');
    }
  };

  const handleReactionChange = (newCount: number, newReaction: string | null) => {
    setLikeCount(newCount);
    setCurrentReaction(newReaction);
  };

  // Prepare media items for MediaGrid - prioritize media_urls, fallback to legacy fields
  let mediaItems: Array<{ url: string; type: 'image' | 'video' }> = [];
  
  if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    // Use new media_urls array
    mediaItems = post.media_urls;
  } else {
    // Fallback to legacy single image/video fields
    if (post.image_url) {
      mediaItems.push({ url: post.image_url, type: 'image' as const });
    }
    if (post.video_url) {
      mediaItems.push({ url: post.video_url, type: 'video' as const });
    }
  }

  return (
    <>
      <div className="fb-card mb-3 sm:mb-4 overflow-hidden mx-0">
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
                {post.profiles?.username}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
                <span>·</span>
                <Globe className="w-3 h-3" />
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
                Lưu bài viết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-3">
                <Link2 className="w-5 h-5" />
                Sao chép liên kết
              </DropdownMenuItem>
              {post.user_id === currentUserId && (
                <>
                  <DropdownMenuItem
                    onClick={() => setShowEditDialog(true)}
                    className="cursor-pointer gap-3"
                  >
                    <Pencil className="w-5 h-5" />
                    Chỉnh sửa bài viết
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      // Radix DropdownMenu fires reliably via onSelect (onClick can be flaky)
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="cursor-pointer text-destructive gap-3"
                  >
                    <Trash2 className="w-5 h-5" />
                    {isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}
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
        <MediaGrid media={mediaItems} />

        {/* Reactions Summary */}
        <ReactionSummary
          postId={post.id}
          reactions={reactionCounts}
          totalCount={likeCount}
          commentCount={commentCount}
          shareCount={shareCount}
          onCommentClick={() => setShowComments(!showComments)}
        />

        {/* Action Buttons - Larger touch targets on mobile */}
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
              onClick={() => setShowComments(!showComments)}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80"
            >
              <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">Bình luận</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80">
                  <Share2 className="w-5 h-5 sm:w-5 sm:h-5" />
                  <span className="font-semibold text-xs sm:text-sm">Chia sẻ</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={handleShareToProfile} className="cursor-pointer min-h-[44px]">
                  Chia sẻ lên trang cá nhân
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer min-h-[44px]">
                  Sao chép liên kết
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border px-4 py-3">
            <CommentSection
              postId={post.id}
              onCommentAdded={() => setCommentCount((prev) => prev + 1)}
            />
          </div>
        )}
      </div>

      <ImageViewer
        imageUrl={post.image_url || ''}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
      />

      <EditPostDialog
        post={post}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onPostUpdated={onPostDeleted}
      />
    </>
  );
};
