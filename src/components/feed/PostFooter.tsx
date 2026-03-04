import { memo } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ReactionButton } from './ReactionButton';
import { ReactionSummary } from './ReactionSummary';
import { DonationButton } from '@/components/donations/DonationButton';
import type { PostData, ReactionCount } from './types';

interface PostFooterProps {
  post: PostData;
  currentUserId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  currentReaction: string | null;
  reactionCounts: ReactionCount[];
  onToggleComments: () => void;
  onReactionChange: (count: number, reaction: string | null) => void;
  onShareClick: () => void;
}

export const PostFooter = memo(function PostFooter({
  post, currentUserId, likeCount, commentCount, shareCount,
  currentReaction, reactionCounts,
  onToggleComments, onReactionChange, onShareClick,
}: PostFooterProps) {
  const { t } = useLanguage();

  return (
    <>
      <ReactionSummary
        postId={post.id}
        reactions={reactionCounts}
        totalCount={likeCount}
        commentCount={commentCount}
        shareCount={shareCount}
        onCommentClick={onToggleComments}
      />

      <div className="border-t border-border mx-2 sm:mx-4">
        <div className="flex items-center py-1">
          <ReactionButton
            postId={post.id}
            currentUserId={currentUserId}
            initialReaction={currentReaction}
            likeCount={likeCount}
            onReactionChange={onReactionChange}
          />

          <button
            onClick={onToggleComments}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-xs sm:text-sm">{t('comment')}</span>
          </button>

          <button
            onClick={onShareClick}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-semibold text-xs sm:text-sm">{t('share')}</span>
          </button>

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
    </>
  );
});
