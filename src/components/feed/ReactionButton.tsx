import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThumbsUp } from 'lucide-react';

const REACTIONS = [
  { type: 'like', icon: '👍', label: 'Thích', color: '#3b82f6' },
  { type: 'love', icon: '❤️', label: 'Yêu thương', color: '#ef4444' },
  { type: 'care', icon: '🥰', label: 'Thương thương', color: '#f97316' },
  { type: 'wow', icon: '😮', label: 'Ngạc nhiên', color: '#eab308' },
  { type: 'haha', icon: '😂', label: 'Haha', color: '#eab308' },
  { type: 'pray', icon: '🙏', label: 'Biết ơn', color: '#a855f7' },
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
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = () => {
    clearTimeouts();
    setShowReactions(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowReactions(false);
      setHoveredReaction(null);
    }, 300);
  };

  // Touch handlers for long-press on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;
    
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowReactions(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Cancel long press if finger moves too much
    if (deltaX > 10 || deltaY > 10) {
      clearTimeouts();
    }
  }, [clearTimeouts]);

  const handleTouchEnd = useCallback(() => {
    clearTimeouts();
    touchStartRef.current = null;
    
    // If it wasn't a long press, handle as normal tap
    if (!isLongPressRef.current && !showReactions) {
      handleReaction(currentReaction || 'like');
    }
    
    // Hide reactions after a delay
    hideTimeoutRef.current = setTimeout(() => {
      setShowReactions(false);
      setHoveredReaction(null);
    }, 3000);
  }, [clearTimeouts, showReactions, currentReaction]);

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

  const handleReactionSelect = (reactionType: string) => {
    setShowReactions(false);
    setHoveredReaction(null);
    handleReaction(reactionType);
  };

  const activeReaction = REACTIONS.find((r) => r.type === currentReaction);

  return (
    <div
      className="relative flex-1 select-none"
      style={{ WebkitTouchCallout: 'none' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => handleReaction(currentReaction || 'like')}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-all hover:bg-secondary active:bg-secondary/80 select-none ${
          currentReaction ? 'text-blue-500' : 'text-muted-foreground'
        } ${isAnimating ? 'scale-110' : ''}`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      >
        {activeReaction ? (
          <>
            <span className="text-lg sm:text-xl transition-transform duration-200 pointer-events-none">{activeReaction.icon}</span>
            <span className="font-semibold text-xs sm:text-sm pointer-events-none" style={{ color: activeReaction.color }}>
              {activeReaction.label}
            </span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-5 h-5 pointer-events-none" />
            <span className="font-semibold text-xs sm:text-sm pointer-events-none">Thích</span>
          </>
        )}
      </button>

      {/* Reactions Popup - Enhanced for mobile with long-press */}
      {showReactions && (
        <>
          {/* Invisible bridge to connect button to popup */}
          <div className="absolute bottom-full left-0 right-0 h-3" />
          <div 
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card rounded-full shadow-2xl border border-border p-2 flex gap-1 z-50 select-none"
            style={{ WebkitTouchCallout: 'none' }}
          >
            {/* Golden glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 via-amber-300/30 to-yellow-400/20 blur-md -z-10 animate-pulse" />
            
            {REACTIONS.map((reaction, index) => (
              <button
                key={reaction.type}
                className={`relative w-12 h-12 sm:w-11 sm:h-11 flex items-center justify-center text-2xl sm:text-2xl transition-all duration-200 rounded-full select-none
                  ${hoveredReaction === reaction.type ? 'scale-150 -translate-y-3 z-10' : 'scale-100'}
                  hover:scale-150 hover:-translate-y-3 active:scale-125
                `}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  animationDelay: `${index * 50}ms`,
                  animation: 'reaction-pop-in 0.3s ease-out forwards',
                  opacity: 0,
                  transform: 'scale(0) translateY(10px)',
                }}
                onClick={() => handleReactionSelect(reaction.type)}
                onMouseEnter={() => setHoveredReaction(reaction.type)}
                onMouseLeave={() => setHoveredReaction(null)}
                onTouchStart={() => setHoveredReaction(reaction.type)}
                title={reaction.label}
              >
                {/* Golden sparkle effect on hover */}
                {hoveredReaction === reaction.type && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-yellow-400/40 to-transparent animate-pulse" />
                )}
                <span className="relative z-10">{reaction.icon}</span>
                
                {/* Label tooltip on hover */}
                {hoveredReaction === reaction.type && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium shadow-lg">
                    {reaction.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      
      {/* CSS for reaction pop-in animation */}
      <style>{`
        @keyframes reaction-pop-in {
          0% {
            opacity: 0;
            transform: scale(0) translateY(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
