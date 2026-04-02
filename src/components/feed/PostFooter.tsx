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
    <div className="mx-2 sm:mx-4">
      {/* Row 1: Reaction summary — emoji+count left, comment/share count right */}
      <ReactionSummary
        postId={post.id}
        reactions={reactionCounts}
        totalCount={likeCount}
        commentCount={commentCount}
        shareCount={shareCount}
        onCommentClick={onToggleComments}
      />

      {/* Row 2: Action buttons — evenly distributed with icon + text */}
      <div className="border-t border-b border-border flex items-center py-0.5 bg-card">
        <ReactionButton
          postId={post.id}
          currentUserId={currentUserId}
          initialReaction={currentReaction}
          likeCount={likeCount}
          onReactionChange={onReactionChange}
        />

        <button
          onClick={onToggleComments}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80 text-sm font-medium"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span>{t('comment')}</span>
        </button>

        <button
          onClick={onShareClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80 text-sm font-medium"
        >
          <Share2 className="w-[18px] h-[18px]" />
          <span>{t('share')}</span>
        </button>

        {post.user_id !== currentUserId && (
          <DonationButton
            recipientId={post.user_id}
            recipientUsername={post.profiles?.username || 'Unknown'}
            recipientDisplayName={post.profiles?.display_name}
            recipientWalletAddress={post.profiles?.public_wallet_address}
            recipientBtcAddress={(post.profiles as any)?.btc_address}
            recipientAvatarUrl={post.profiles?.avatar_url}
            postId={post.id}
            variant="footer"
          />
        )}
      </div>
    </div>
  );
});
