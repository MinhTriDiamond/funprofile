import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThumbsUp } from 'lucide-react';

const REACTIONS = [
  { type: 'like', icon: '👍', label: 'Thích', bgColor: 'bg-blue-500' },
  { type: 'love', icon: '❤️', label: 'Yêu thích', bgColor: 'bg-red-500' },
  { type: 'haha', icon: '😆', label: 'Haha', bgColor: 'bg-yellow-500' },
  { type: 'wow', icon: '😮', label: 'Wow', bgColor: 'bg-yellow-500' },
  { type: 'sad', icon: '😢', label: 'Buồn', bgColor: 'bg-yellow-500' },
  { type: 'angry', icon: '😠', label: 'Phẫn nộ', bgColor: 'bg-orange-500' },
];

interface ReactionButtonProps {
  postId: string;
  currentUserId: string;
  initialReaction?: string | null;
  likeCount: number;
  onReactionChange: (newCount: number, newReaction: string | null) => void;
}

export const ReactionButton = ({
  postId,
  currentUserId,
  initialReaction = null,
  likeCount,
  onReactionChange,
}: ReactionButtonProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(initialReaction);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleReaction = async (reactionType: string) => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để bày tỏ cảm xúc');
      return;
    }

    setShowReactions(false);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      if (currentReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .is('comment_id', null);

        setCurrentReaction(null);
        onReactionChange(likeCount - 1, null);
      } else if (currentReaction) {
        // Update existing reaction
        await supabase
          .from('reactions')
          .update({ type: reactionType })
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .is('comment_id', null);

        setCurrentReaction(reactionType);
        onReactionChange(likeCount, reactionType);
      } else {
        // Add new reaction
        await supabase.from('reactions').insert({
          post_id: postId,
          user_id: currentUserId,
          type: reactionType,
        });

        setCurrentReaction(reactionType);
        onReactionChange(likeCount + 1, reactionType);
      }
    } catch (error) {
      toast.error('Không thể cập nhật cảm xúc');
    }
  };

  const activeReaction = REACTIONS.find((r) => r.type === currentReaction);

  return (
    <div
      className="relative flex-1"
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <button
        onClick={() => handleReaction(currentReaction || 'like')}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all hover:bg-secondary ${
          currentReaction ? 'text-blue-500' : 'text-muted-foreground'
        } ${isAnimating ? 'scale-110' : ''}`}
      >
        {activeReaction ? (
          <>
            <span className="text-xl">{activeReaction.icon}</span>
            <span className="font-semibold text-sm" style={{ color: activeReaction.type === 'like' ? '#3b82f6' : activeReaction.type === 'love' ? '#ef4444' : '#eab308' }}>
              {activeReaction.label}
            </span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-5 h-5" />
            <span className="font-semibold text-sm">Thích</span>
          </>
        )}
      </button>

      {/* Reactions Popup */}
      {showReactions && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card rounded-full shadow-xl border border-border p-1.5 flex gap-0.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-150 transition-transform duration-200 hover:-translate-y-1"
              onClick={() => handleReaction(reaction.type)}
              title={reaction.label}
            >
              {reaction.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
