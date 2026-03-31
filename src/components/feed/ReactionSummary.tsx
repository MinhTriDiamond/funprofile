import { useState } from 'react';
import { ReactionViewerDialog } from './ReactionViewerDialog';
import { ReactionTooltipContent } from './ReactionTooltipContent';
import { useLanguage } from '@/i18n/LanguageContext';
import { TwemojiImage } from '@/components/ui/TwemojiImage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReactionCount {
  type: string;
  count: number;
}

interface ReactionSummaryProps {
  postId: string;
  reactions: ReactionCount[];
  totalCount: number;
  commentCount: number;
  shareCount: number;
  onCommentClick: () => void;
}

const REACTION_ICONS: Record<string, { icon: string; bgColor: string }> = {
  gratitude: { icon: '🙏', bgColor: 'bg-purple-500' },
  care: { icon: '🥰', bgColor: 'bg-orange-500' },
  like: { icon: '👍', bgColor: 'bg-blue-500' },
  love: { icon: '❤️', bgColor: 'bg-red-500' },
  haha: { icon: '😂', bgColor: 'bg-yellow-500' },
  wow: { icon: '😮', bgColor: 'bg-yellow-500' },
};

export const ReactionSummary = ({
  postId,
  reactions,
  totalCount,
  commentCount,
  shareCount,
  onCommentClick,
}: ReactionSummaryProps) => {
  const [showViewerDialog, setShowViewerDialog] = useState(false);
  const { t } = useLanguage();
  if (totalCount === 0 && commentCount === 0 && shareCount === 0) {
    return null;
  }

  const sortedReactions = [...reactions]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((r) => r.count > 0);

  return (
    <>
      <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
        {/* Left: emoji icons + total count */}
        <div>
          {totalCount > 0 && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowViewerDialog(true)}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <div className="flex -space-x-1">
                      {sortedReactions.map((reaction, index) => {
                        const reactionInfo = REACTION_ICONS[reaction.type];
                        if (!reactionInfo) return null;
                        return (
                          <span
                            key={reaction.type}
                            className={`w-[18px] h-[18px] rounded-full ${reactionInfo.bgColor} flex items-center justify-center text-xs border-[1.5px] border-card`}
                            style={{ zIndex: 3 - index }}
                          >
                            <TwemojiImage emoji={reactionInfo.icon} size={12} />
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-xs">{totalCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-2">
                  <ReactionTooltipContent postId={postId} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right: comment count + share count */}
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <button onClick={onCommentClick} className="hover:underline text-xs">
              {commentCount} {t('comments')}
            </button>
          )}
          {shareCount > 0 && (
            <span className="hover:underline cursor-pointer text-xs">
              {shareCount} {t('shares')}
            </span>
          )}
        </div>
      </div>

      <ReactionViewerDialog
        open={showViewerDialog}
        onOpenChange={setShowViewerDialog}
        postId={postId}
        reactions={reactions}
        totalCount={totalCount}
      />
    </>
  );
};
