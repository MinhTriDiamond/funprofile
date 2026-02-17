import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';
import { CommentSection } from './CommentSection';
import { ReactionButton } from './ReactionButton';
import { ReactionSummary } from './ReactionSummary';
import { ImageViewer } from './ImageViewer';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { playCelebrationMusic } from '@/lib/celebrationSounds';
import confetti from 'canvas-confetti';
import {
  ExternalLink, MessageCircle, Share2, Sparkles, Gift, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

interface GiftCelebrationCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    image_url?: string | null;
    gift_sender_id?: string | null;
    gift_recipient_id?: string | null;
    gift_token?: string | null;
    gift_amount?: string | null;
    gift_message?: string | null;
    tx_hash?: string | null;
    is_highlighted?: boolean;
    highlight_expires_at?: string | null;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
  onPostDeleted: () => void;
  initialStats?: PostStats;
  recipientProfile?: { username: string; avatar_url: string | null } | null;
}

const GiftCelebrationCardComponent = ({
  post,
  currentUserId,
  onPostDeleted,
  initialStats,
}: GiftCelebrationCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);
  const hasConfettiFiredRef = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialStats?.commentCount || 0);
  const [likeCount, setLikeCount] = useState(initialStats?.reactions?.length || 0);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<{ type: string; count: number }[]>([]);
  const [shareCount, setShareCount] = useState(initialStats?.shareCount || 0);
  const [recipientProfile, setRecipientProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [senderProfile, setSenderProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  // Check if sender is different from post author (e.g. Treasury claim)
  const isTreasurySender = post.gift_sender_id && post.gift_sender_id !== post.user_id;

  const isHighlighted = post.is_highlighted && post.highlight_expires_at && new Date(post.highlight_expires_at) > new Date();

  // Fetch recipient profile
  useEffect(() => {
    if (!post.gift_recipient_id) return;
    supabase
      .from('public_profiles')
      .select('username, avatar_url')
      .eq('id', post.gift_recipient_id)
      .single()
      .then(({ data }) => {
        if (data) setRecipientProfile(data);
      });
  }, [post.gift_recipient_id]);

  // Fetch sender profile when sender differs from post author (e.g. Treasury claim)
  useEffect(() => {
    if (!isTreasurySender) return;
    supabase
      .from('public_profiles')
      .select('username, avatar_url')
      .eq('id', post.gift_sender_id!)
      .single()
      .then(({ data }) => {
        if (data) setSenderProfile(data);
      });
  }, [isTreasurySender, post.gift_sender_id]);

  // Process initial stats
  useEffect(() => {
    if (initialStats) {
      setLikeCount(initialStats.reactions.length);
      setCommentCount(initialStats.commentCount);
      setShareCount(initialStats.shareCount);
      const userReaction = initialStats.reactions.find(r => r.user_id === currentUserId);
      setCurrentReaction(userReaction?.type || null);
      const counts: Record<string, number> = {};
      initialStats.reactions.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
      setReactionCounts(Object.entries(counts).map(([type, count]) => ({ type, count })));
    }
  }, [initialStats, currentUserId]);

  // Sound + confetti on first appearance
  useEffect(() => {
    if (hasPlayedRef.current) return;

    const isMuted = localStorage.getItem('celebration_muted') === 'true';

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!hasPlayedRef.current && !isMuted) {
            const audio = playCelebrationMusic('rich-1');
            if (audio) {
              audio.volume = 0.3;
              setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 10000);
            }
            hasPlayedRef.current = true;
          }

          if (!hasConfettiFiredRef.current) {
            hasConfettiFiredRef.current = true;
            const rect = cardRef.current?.getBoundingClientRect();
            if (rect) {
              const x = (rect.left + rect.width / 2) / window.innerWidth;
              const y = (rect.top + rect.height / 4) / window.innerHeight;
              confetti({
                particleCount: 60,
                spread: 70,
                origin: { x, y },
                zIndex: 9998,
                disableForReducedMotion: true,
                colors: ['#FFD700', '#10b981', '#ef4444', '#3b82f6', '#f97316'],
              });
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll-back sound (5s)
  useEffect(() => {
    if (!hasPlayedRef.current) return;
    const isMuted = localStorage.getItem('celebration_muted') === 'true';
    if (isMuted) return;

    let audioInstance: HTMLAudioElement | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasPlayedRef.current) {
          audioInstance = playCelebrationMusic('rich-1');
          if (audioInstance) {
            audioInstance.volume = 0.2;
            setTimeout(() => { audioInstance?.pause(); }, 5000);
          }
        }
      },
      { threshold: 0.5 }
    );

    const timer = setTimeout(() => {
      if (cardRef.current) observer.observe(cardRef.current);
    }, 12000);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      audioInstance?.pause();
    };
  }, []);

  const handleReactionChange = useCallback((newCount: number, newReaction: string | null) => {
    setLikeCount(newCount);
    setCurrentReaction(newReaction);
  }, []);

  const amount = post.gift_amount ? Number(post.gift_amount).toLocaleString() : '0';
  const token = post.gift_token || 'FUN';
  const actualSenderProfile = isTreasurySender ? senderProfile : post.profiles;
  const senderUsername = actualSenderProfile?.username || 'FUN Profile Treasury';
  const senderAvatarUrl = actualSenderProfile?.avatar_url || '/fun-profile-treasury-logo.jpg';
  const senderNavigateId = isTreasurySender ? post.gift_sender_id : post.user_id;
  const recipientUsername = recipientProfile?.username || 'User';
  const scanUrl = post.tx_hash ? getBscScanTxUrl(post.tx_hash, token) : '#';
  const truncatedMessage = post.gift_message && post.gift_message.length > 120
    ? post.gift_message.slice(0, 120) + '...'
    : post.gift_message;

  return (
    <div
      ref={cardRef}
      className="mb-3 sm:mb-4 overflow-hidden rounded-xl animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, #10b981, #059669, #047857)',
        boxShadow: isHighlighted
          ? '0 0 20px rgba(16,185,129,0.4), 0 4px 20px rgba(0,0,0,0.1)'
          : '0 2px 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Sparkle overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${15 + i * 20}%`,
              top: `${10 + (i % 2) * 15}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <Sparkles className="w-3 h-3 text-yellow-300/60" />
          </div>
        ))}
      </div>

      {/* Highlighted badge */}
      {isHighlighted && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
          <Gift className="w-3.5 h-3.5 text-yellow-300" />
          <span className="text-xs font-semibold text-yellow-200">🎉 Gift Celebration</span>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 pt-2">
        {/* Avatars row */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex flex-col items-center">
            <Avatar
              className="w-12 h-12 ring-2 ring-white/40 cursor-pointer"
              onClick={() => senderNavigateId && navigate(`/profile/${senderNavigateId}`)}
            >
              <AvatarImage src={senderAvatarUrl} />
              <AvatarFallback className="bg-emerald-700 text-white">
                {senderUsername[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-white/80 mt-1 truncate max-w-[80px]">@{senderUsername}</span>
          </div>

          <div className="flex items-center gap-1">
            <ArrowRight className="w-5 h-5 text-yellow-300" />
            <Gift className="w-5 h-5 text-yellow-300" />
          </div>

          <div className="flex flex-col items-center">
            <Avatar
              className="w-12 h-12 ring-2 ring-white/40 cursor-pointer"
              onClick={() => post.gift_recipient_id && navigate(`/profile/${post.gift_recipient_id}`)}
            >
              <AvatarImage src={recipientProfile?.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-700 text-white">
                {recipientUsername[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-white/80 mt-1 truncate max-w-[80px]">@{recipientUsername}</span>
          </div>
        </div>

        {/* Main text */}
        <div className="text-center mb-3">
          <p className="text-lg font-bold text-white leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {isTreasurySender ? (
              <>🎉 @{recipientUsername} đã nhận thưởng{' '}
                <span className="text-yellow-300">{amount} {token}</span>{' '}
                từ @{senderUsername} ❤️</>
            ) : (
              <>🎉 @{senderUsername} đã trao gửi{' '}
                <span className="text-yellow-300">{amount} {token}</span>{' '}
                cho @{recipientUsername} ❤️</>
            )}
          </p>
        </div>

        {/* Celebration Image */}
        {post.image_url && (
          <div
            className="mb-3 rounded-lg overflow-hidden cursor-pointer ring-2 ring-yellow-300/30 hover:ring-yellow-300/60 transition-all"
            onClick={() => setImageViewerOpen(true)}
          >
            <img
              src={post.image_url}
              alt="Celebration Card"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Gift message */}
        {truncatedMessage && (
          <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2 mb-3 text-center">
            <p className="text-sm text-white/90 italic">"{truncatedMessage}"</p>
          </div>
        )}

        {/* Time + BscScan */}
        <div className="flex items-center justify-between text-xs text-white/60 mb-2">
          <span>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
          </span>
          {post.tx_hash && (
            <a
              href={scanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-yellow-200 hover:text-yellow-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Xem giao dịch
            </a>
          )}
        </div>
      </div>

      {/* Reactions Summary */}
      <div className="bg-black/10">
        <ReactionSummary
          postId={post.id}
          reactions={reactionCounts}
          totalCount={likeCount}
          commentCount={commentCount}
          shareCount={shareCount}
          onCommentClick={() => setShowComments(prev => !prev)}
        />
      </div>

      {/* Action Buttons */}
      <div className="border-t border-white/10 mx-2 sm:mx-4 bg-black/10">
        <div className="flex items-center py-1">
          <ReactionButton
            postId={post.id}
            currentUserId={currentUserId}
            initialReaction={currentReaction}
            likeCount={likeCount}
            onReactionChange={handleReactionChange}
          />
          <button
            onClick={() => setShowComments(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-white/10 text-white/70"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-xs sm:text-sm">{t('comment')}</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-white/10 text-white/70"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
            }}
          >
            <Share2 className="w-5 h-5" />
            <span className="font-semibold text-xs sm:text-sm">{t('share')}</span>
          </button>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-white/10 px-4 py-3 bg-white dark:bg-gray-900 rounded-b-xl">
          <CommentSection
            postId={post.id}
            onCommentAdded={() => setCommentCount(prev => prev + 1)}
          />
        </div>
      )}

      {/* Image Viewer Dialog */}
      {post.image_url && (
        <ImageViewer
          imageUrl={post.image_url}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </div>
  );
};

export const GiftCelebrationCard = memo(GiftCelebrationCardComponent);
GiftCelebrationCard.displayName = 'GiftCelebrationCard';
