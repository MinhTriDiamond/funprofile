import { useState, useRef, useEffect, useCallback } from 'react';
import { useReels } from '@/hooks/useReels';
import ReelPlayer from './ReelPlayer';
import ReelInfo from './ReelInfo';
import ReelComments from './ReelComments';
import { CreateReelDialog } from './CreateReelDialog';
import { ShareReelDialog } from './ShareReelDialog';
import { DoubleTapLike } from './DoubleTapLike';
import { Heart, MessageCircle, Share2, Bookmark, Plus, Volume2, VolumeX } from 'lucide-react';
import { useReelBookmarks } from '@/hooks/useReelBookmarks';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

const ReelsFeed = () => {
  const { reels, isLoading, toggleLike, recordView, currentUser } = useReels(20);
  const { toggleBookmark } = useReelBookmarks();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const viewRecorded = useRef<Set<string>>(new Set());

  const currentReel = reels[currentIndex];

  // Record view when reel changes
  useEffect(() => {
    if (currentReel && !viewRecorded.current.has(currentReel.id)) {
      viewRecorded.current.add(currentReel.id);
      recordView(currentReel.id);
    }
  }, [currentReel?.id, recordView]);

  // Scroll handling for reel navigation
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== currentIndex && index >= 0 && index < reels.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, reels.length]);

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (currentReel && !currentReel.is_liked && currentUser) {
        toggleLike.mutate({ reelId: currentReel.id, isLiked: false });
        setShowDoubleTapHeart(true);
        setTimeout(() => setShowDoubleTapHeart(false), 1000);
      }
    }
    lastTap.current = now;
  }, [currentReel, currentUser, toggleLike]);

  const handleLike = () => {
    if (!currentUser) { toast.error(t('pleaseLoginToReact')); return; }
    if (currentReel) toggleLike.mutate({ reelId: currentReel.id, isLiked: !!currentReel.is_liked });
  };

  const handleBookmark = () => {
    if (!currentUser) { toast.error(t('pleaseLoginToReact')); return; }
    if (currentReel) toggleBookmark.mutate({ reelId: currentReel.id, isBookmarked: !!currentReel.is_bookmarked, userId: currentUser.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-4">
        <p className="text-lg">{t('noReelsYet')}</p>
        {currentUser && (
          <button onClick={() => setCreateOpen(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" /> {t('createReel')}
          </button>
        )}
        <CreateReelDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      {/* Reels Container - Vertical scroll snap */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
        onClick={handleDoubleTap}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="h-full w-full snap-start snap-always relative flex items-center justify-center">
            <ReelPlayer
              videoUrl={reel.video_url}
              isActive={index === currentIndex}
              isMuted={isMuted}
            />
            {/* Double tap heart */}
            {index === currentIndex && showDoubleTapHeart && <DoubleTapLike />}
            
            {/* Reel Info overlay */}
            <ReelInfo reel={reel} />
          </div>
        ))}
      </div>

      {/* Right side action buttons */}
      {currentReel && (
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ${currentReel.is_liked ? 'text-red-500' : 'text-white'}`}>
              <Heart className={`w-6 h-6 ${currentReel.is_liked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-white text-xs font-medium">{currentReel.like_count}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">{currentReel.comment_count}</span>
          </button>

          {/* Share */}
          <button onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">{currentReel.share_count}</span>
          </button>

          {/* Bookmark */}
          <button onClick={handleBookmark} className="flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ${currentReel.is_bookmarked ? 'text-yellow-400' : 'text-white'}`}>
              <Bookmark className={`w-6 h-6 ${currentReel.is_bookmarked ? 'fill-current' : ''}`} />
            </div>
          </button>

          {/* Mute toggle */}
          <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </div>
          </button>
        </div>
      )}

      {/* Create button */}
      {currentUser && (
        <button
          onClick={() => setCreateOpen(true)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Dialogs */}
      {currentReel && (
        <>
          <ReelComments
            reelId={currentReel.id}
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
          />
          <ShareReelDialog
            reelId={currentReel.id}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
        </>
      )}
      <CreateReelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default ReelsFeed;
