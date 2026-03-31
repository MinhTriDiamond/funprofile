import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAbsolutePostUrl } from '@/lib/slug';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { CommentSection } from './CommentSection';
import { ReactionButton } from './ReactionButton';
import { ReactionSummary } from './ReactionSummary';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { playCelebrationMusic } from '@/lib/celebrationSounds';
import confetti from 'canvas-confetti';
import {
  ExternalLink, MessageCircle, Share2, Sparkles, Gift, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWalletLabelMap } from '@/hooks/useExternalWalletLabels';
import camlyCoinImg from '@/assets/camly-coin.png';
import funMoneyCoinImg from '@/assets/fun-money-coin.png';

const FLOATING_COINS = [
  // Hàng trên
  { top: '5%', left: '3%', size: 18, delay: '0s', anim: 'animate-float-coin' },
  { top: '8%', left: '25%', size: 14, delay: '0.7s', anim: 'animate-sparkle-coin' },
  { top: '3%', left: '50%', size: 20, delay: '1.3s', anim: 'animate-float-coin' },
  { top: '10%', right: '8%', size: 24, delay: '0.5s', anim: 'animate-sparkle-coin' },
  // Hàng giữa trên
  { top: '25%', left: '8%', size: 16, delay: '1.8s', anim: 'animate-sparkle-coin' },
  { top: '30%', left: '40%', size: 12, delay: '0.3s', anim: 'animate-float-coin' },
  { top: '28%', right: '5%', size: 22, delay: '2.2s', anim: 'animate-float-coin' },
  // Hàng giữa
  { top: '45%', left: '3%', size: 16, delay: '1s', anim: 'animate-float-coin' },
  { top: '50%', left: '60%', size: 14, delay: '1.5s', anim: 'animate-sparkle-coin' },
  { top: '48%', right: '10%', size: 18, delay: '0.2s', anim: 'animate-float-coin' },
  // Hàng giữa dưới
  { top: '60%', left: '15%', size: 20, delay: '1.2s', anim: 'animate-sparkle-coin' },
  { top: '65%', left: '75%', size: 16, delay: '2s', anim: 'animate-float-coin' },
  // Hàng dưới
  { top: '75%', left: '5%', size: 18, delay: '0.8s', anim: 'animate-float-coin' },
  { top: '78%', left: '35%', size: 22, delay: '1.6s', anim: 'animate-sparkle-coin' },
  { top: '80%', right: '12%', size: 26, delay: '2s', anim: 'animate-sparkle-coin' },
  { top: '85%', left: '55%', size: 14, delay: '0.4s', anim: 'animate-float-coin' },
];

interface GiftProfile {
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
}

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
    gift_sender_id?: string | null;
    gift_recipient_id?: string | null;
    gift_token?: string | null;
    gift_amount?: string | null;
    gift_message?: string | null;
    tx_hash?: string | null;
    is_highlighted?: boolean;
    highlight_expires_at?: string | null;
    metadata?: Record<string, unknown>;
    profiles: {
      username: string;
      display_name?: string | null;
      avatar_url: string | null;
    };
    recipientProfile?: GiftProfile | null;
    senderProfile?: GiftProfile | null;
  };
  currentUserId: string;
  onPostDeleted: () => void;
  initialStats?: PostStats;
  disableRealtime?: boolean;
  disableEffects?: boolean;
}

const GiftCelebrationCardComponent = ({
  post,
  currentUserId,
  onPostDeleted,
  initialStats,
  disableRealtime = false,
  disableEffects = false,
}: GiftCelebrationCardProps) => {
  // "New" glow effect for posts < 60s old
  const [isNew, setIsNew] = useState(() => {
    const diff = Date.now() - new Date(post.created_at).getTime();
    return diff < 60000;
  });

  useEffect(() => {
    if (!isNew) return;
    const remaining = 60000 - (Date.now() - new Date(post.created_at).getTime());
    if (remaining <= 0) { setIsNew(false); return; }
    const timer = setTimeout(() => setIsNew(false), remaining);
    return () => clearTimeout(timer);
  }, [isNew, post.created_at]);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const dateLocale = useDateLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);
  const hasConfettiFiredRef = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialStats?.commentCount || 0);
  const [likeCount, setLikeCount] = useState(initialStats?.reactions?.length || 0);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<{ type: string; count: number }[]>([]);
  const [shareCount, setShareCount] = useState(initialStats?.shareCount || 0);
  // Use pre-fetched profiles from hook (no loading state / flash of "User")
  const [recipientProfile, setRecipientProfile] = useState(post.recipientProfile || null);
  const [senderProfile, setSenderProfile] = useState(post.senderProfile || null);

  // Check if sender is different from post author (e.g. Treasury claim)
  const isTreasurySender = post.gift_sender_id && post.gift_sender_id !== post.user_id;

  // Check if this is an external wallet gift (no sender_id, metadata has is_external)
  const postMeta = post.metadata;
  const isExternalGift = !post.gift_sender_id && postMeta?.is_external === true;
  const externalSenderAddress = isExternalGift ? (postMeta?.sender_address as string) : null;
  const externalSenderName = isExternalGift ? (postMeta?.sender_name as string) : null;

  // Resolve external wallet label from admin-managed labels
  const walletLabelMap = useWalletLabelMap();
  const resolvedExternalLabel = externalSenderAddress
    ? walletLabelMap.get(externalSenderAddress.toLowerCase()) || externalSenderName
    : externalSenderName;

  const isHighlighted = post.is_highlighted && post.highlight_expires_at && new Date(post.highlight_expires_at) > new Date();

  // Fallback: fetch profiles if pre-fetched data is missing (e.g. realtime new post)
  useEffect(() => {
    if (recipientProfile || !post.gift_recipient_id) return;
    supabase
      .from('public_profiles')
      .select('username, display_name, avatar_url')
      .eq('id', post.gift_recipient_id)
      .single()
      .then(({ data }) => { if (data) setRecipientProfile(data); });
  }, [post.gift_recipient_id, recipientProfile]);

  useEffect(() => {
    if (senderProfile || !isTreasurySender) return;
    supabase
      .from('public_profiles')
      .select('username, display_name, avatar_url')
      .eq('id', post.gift_sender_id!)
      .single()
      .then(({ data }) => { if (data) setSenderProfile(data); });
  }, [isTreasurySender, post.gift_sender_id, senderProfile]);

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

  // Sound + confetti on first appearance (single observer, no scroll-back)
  useEffect(() => {
    if (disableEffects) return;

    const isMobile = window.innerWidth < 768;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!hasPlayedRef.current) {
            const audio = playCelebrationMusic('rich-1');
            if (audio) {
              audio.volume = 0.3;
              hasPlayedRef.current = true;
            }
          }

          // Skip confetti on mobile to save resources
          if (!hasConfettiFiredRef.current && !isMobile) {
            hasConfettiFiredRef.current = true;
            const rect = cardRef.current?.getBoundingClientRect();
            if (rect) {
              const x = (rect.left + rect.width / 2) / window.innerWidth;
              const y = (rect.top + rect.height / 4) / window.innerHeight;
              confetti({
                particleCount: 40,
                spread: 55,
                origin: { x, y },
                zIndex: 9998,
                disableForReducedMotion: true,
                colors: ['#FFD700', '#10b981', '#ef4444', '#3b82f6', '#f97316'],
              });
            }
          }

          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [disableEffects]);

  const handleReactionChange = useCallback((newCount: number, newReaction: string | null) => {
    setLikeCount(newCount);
    setCurrentReaction(newReaction);
  }, []);

  const rawAmount = post.gift_amount ? Number(post.gift_amount) : 0;
  const amount = rawAmount === 0 ? '0' : rawAmount < 1 ? rawAmount.toLocaleString('vi-VN', { maximumFractionDigits: 8 }) : rawAmount.toLocaleString('vi-VN', { maximumFractionDigits: 6 });
  const token = post.gift_token || 'FUN';
  // For external gifts, show external wallet info
  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '0x...';
  const actualSenderProfile = isExternalGift ? null : (isTreasurySender ? senderProfile : post.profiles);
  const senderDisplayName = isExternalGift
    ? (resolvedExternalLabel || shortenAddr(externalSenderAddress || ''))
    : (actualSenderProfile?.display_name || actualSenderProfile?.username || 'FUN Profile Treasury');
  const senderUsername = isExternalGift
    ? shortenAddr(externalSenderAddress || '')
    : (actualSenderProfile?.username || 'FUN Profile Treasury');
  const senderAvatarUrl = isExternalGift ? '' : (actualSenderProfile?.avatar_url || '/fun-profile-treasury-logo.jpg');
  const senderNavigateId = isExternalGift ? null : (isTreasurySender ? post.gift_sender_id : post.user_id);

  // Parse recipient name from post content as fallback when gift_recipient_id is null
  const parseRecipientFromContent = (): string | null => {
    if (!post.content) return null;
    // Content format: "🎉 @sender đã trao gửi X TOKEN cho @recipient ❤️"
    const match = post.content.match(/cho @(\S+)/);
    return match ? match[1] : null;
  };
  const fallbackRecipientName = parseRecipientFromContent();

  const recipientDisplayName = recipientProfile?.display_name || recipientProfile?.username || fallbackRecipientName || 'User';
  const recipientUsername = recipientProfile?.username || fallbackRecipientName || 'User';
  const scanUrl = post.tx_hash ? getBscScanTxUrl(post.tx_hash, token) : '#';
  const [showFullMessage, setShowFullMessage] = useState(false);
  const isLongMessage = post.gift_message && post.gift_message.length > 120;
  const displayMessage = isLongMessage && !showFullMessage
    ? post.gift_message!.slice(0, 120) + '...'
    : post.gift_message;

  return (
    <div
      ref={cardRef}
      className={`mb-3 sm:mb-4 overflow-hidden rounded-xl animate-fade-in relative ${isNew ? 'animate-pulse' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 30%, #065f46 60%, #064e3b 100%)',
        border: isNew
          ? '2px solid rgba(255, 215, 0, 0.6)'
          : '1px solid rgba(255, 215, 0, 0.25)',
        boxShadow: isNew
          ? '0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(255, 215, 0, 0.2)'
          : isHighlighted
            ? '0 0 20px rgba(16,185,129,0.4), 0 4px 20px rgba(0,0,0,0.1)'
            : '0 2px 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Floating CAMLY coins */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {FLOATING_COINS.map((coin, i) => (
          <img
            key={i}
            src={i % 2 === 0 ? camlyCoinImg : funMoneyCoinImg}
            alt=""
            className={`absolute rounded-full ${coin.anim}`}
            style={{
              top: coin.top,
              left: coin.left,
              right: (coin as any).right,
              width: coin.size,
              height: coin.size,
              animationDelay: coin.delay,
              filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.6))',
            }}
          />
        ))}
      </div>

      {/* "New" badge */}
      {isNew && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
          ✨ Mới
        </div>
      )}

      {/* Highlighted badge */}
      {isHighlighted && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
          <Gift className="w-3.5 h-3.5 text-yellow-300" />
          <span className="text-xs font-semibold text-yellow-200">🎉 {t('giftCelebration')}</span>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 pt-2">
        {/* Avatars row */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex flex-col items-center">
            <Avatar
              className="w-12 h-12 ring-2 ring-yellow-400/50 cursor-pointer"
              onClick={() => {
                if (isExternalGift && externalSenderAddress) {
                  window.open(`https://bscscan.com/address/${externalSenderAddress}`, '_blank');
                } else if (senderNavigateId) {
                  navigate(`/profile/${senderNavigateId}`);
                }
              }}
            >
              <AvatarImage src={senderAvatarUrl} />
              <AvatarFallback className="bg-emerald-700 text-white">
                {isExternalGift ? '🌐' : senderDisplayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button className="text-center mt-1 cursor-pointer" onClick={() => {
              if (isExternalGift && externalSenderAddress) {
                window.open(`https://bscscan.com/address/${externalSenderAddress}`, '_blank');
              } else if (senderNavigateId) {
                navigate(`/profile/${senderNavigateId}`);
              }
            }}>
              <div className="text-xs font-semibold text-white/90 truncate max-w-[120px] hover:underline">{senderDisplayName}</div>
              {isExternalGift ? (
                <div className="text-[10px] text-white/60 truncate max-w-[120px] hover:underline">{shortenAddr(externalSenderAddress || '')}</div>
              ) : senderUsername && senderUsername !== 'FUN Profile Treasury' ? (
                <div className="text-[10px] text-white/60 truncate max-w-[120px] hover:underline">@{senderUsername}</div>
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <ArrowRight className="w-5 h-5 text-yellow-300" />
            <Gift className="w-5 h-5 text-yellow-300" />
          </div>

          <div className="flex flex-col items-center">
            <Avatar
              className="w-12 h-12 ring-2 ring-yellow-400/50 cursor-pointer"
              onClick={() => post.gift_recipient_id && navigate(`/profile/${post.gift_recipient_id}`)}
            >
              <AvatarImage src={recipientProfile?.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-700 text-white">
                {recipientDisplayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button className="text-center mt-1 cursor-pointer" onClick={() => post.gift_recipient_id && navigate(`/profile/${post.gift_recipient_id}`)}>
              <div className="text-xs font-semibold text-white/90 truncate max-w-[80px] hover:underline">{recipientDisplayName}</div>
              {recipientUsername && recipientUsername !== 'User' && (
                <div className="text-[10px] text-white/60 truncate max-w-[80px] hover:underline">@{recipientUsername}</div>
              )}
            </button>
          </div>
        </div>

        {/* Main text */}
        <div className="text-center mb-3">
          <p className="text-lg font-bold text-white leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {isTreasurySender ? (
              <>🎉 <span className="cursor-pointer hover:underline" onClick={() => post.gift_recipient_id && navigate(`/profile/${post.gift_recipient_id}`)}>{recipientDisplayName}</span> {t('giftReceivedReward')}{' '}
                <span className="text-yellow-300">{amount} {token}</span>{' '}
                {t('giftFrom')} <span className="cursor-pointer hover:underline" onClick={() => senderNavigateId && navigate(`/profile/${senderNavigateId}`)}>{senderDisplayName}</span> ❤️</>
            ) : (
              <>🎉 {isExternalGift && externalSenderAddress ? (
                <span className="cursor-pointer hover:underline" onClick={() => window.open(`https://bscscan.com/address/${externalSenderAddress}`, '_blank')}>{senderDisplayName}</span>
              ) : (
                <span className="cursor-pointer hover:underline" onClick={() => senderNavigateId && navigate(`/profile/${senderNavigateId}`)}>{senderDisplayName}</span>
              )} {t('giftSentTo')}{' '}
                <span className="text-yellow-300">{amount} {token}</span>{' '}
                {t('giftTo')} <span className="cursor-pointer hover:underline" onClick={() => post.gift_recipient_id && navigate(`/profile/${post.gift_recipient_id}`)}>{recipientDisplayName}</span> ❤️</>
            )}
          </p>
        </div>

        {/* Gift message */}
        {displayMessage && (
          <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2 mb-3 text-center">
            <p className="text-sm text-white/90 italic">"{displayMessage}"</p>
            {isLongMessage && (
              <button
                onClick={() => setShowFullMessage(prev => !prev)}
                className="text-xs text-yellow-200 hover:text-yellow-100 mt-1 font-medium transition-colors"
              >
                {showFullMessage ? `${t('collapseText')} ▲` : `${t('showMoreText')} ▼`}
              </button>
            )}
          </div>
        )}

        {/* Time + BscScan */}
        <div className="flex items-center justify-between text-xs text-white/60 mb-2">
          <span>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}
          </span>
          {post.tx_hash && (
            <a
              href={scanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-yellow-200 hover:text-yellow-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {t('viewTransaction')}
            </a>
          )}
        </div>
      </div>

      {/* Reactions Summary */}
        <div className="bg-black/10 [&_.text-muted-foreground]:text-white/70 [&_.text-sm]:text-white/70 [&_.border-card]:border-transparent">
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
      <div className="border-t border-white/10 mx-2 sm:mx-4 bg-black/10 [&_.text-muted-foreground]:text-white/70">
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
              navigator.clipboard.writeText(getAbsolutePostUrl(post));
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
            disableRealtime={disableRealtime}
          />
        </div>
      )}
    </div>
  );
};

export const GiftCelebrationCard = memo(GiftCelebrationCardComponent);
GiftCelebrationCard.displayName = 'GiftCelebrationCard';
