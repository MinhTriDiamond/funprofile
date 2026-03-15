import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/LazyImage';
import { CoverPhotoEditor } from '@/components/profile/CoverPhotoEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { CoverHonorBoard, MobileStats } from '@/components/profile/CoverHonorBoard';
import { AvatarOrbit } from '@/components/profile/AvatarOrbit';
import { FriendRequestButton } from '@/components/friends/FriendRequestButton';
import { DonationButton } from '@/components/donations/DonationButton';
import { MoreHorizontal, MapPin, Briefcase, MessageCircle, Eye, X, PenSquare, Copy, Wallet, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';
import { useLanguage } from '@/i18n/LanguageContext';
import type { ProfileData, FriendPreview } from '@/hooks/useProfile';

interface ProfileHeaderProps {
  profile: ProfileData;
  currentUserId: string;
  isOwnProfile: boolean;
  isAdmin: boolean;
  showPrivateElements: boolean;
  viewAsPublic: boolean;
  friendsPreview: FriendPreview[];
  onSetProfile: (updater: (prev: ProfileData | null) => ProfileData | null) => void;
  onNavigateToTab: (tab: string) => void;
  onStartChat: () => void;
  onSetViewAsPublic: (v: boolean) => void;
  onSetShowAvatarViewer: (v: boolean) => void;
  chatPending: boolean;
}

export const ProfileHeader = ({
  profile,
  currentUserId,
  isOwnProfile,
  isAdmin,
  showPrivateElements,
  viewAsPublic,
  friendsPreview,
  onSetProfile,
  onNavigateToTab,
  onStartChat,
  onSetViewAsPublic,
  onSetShowAvatarViewer,
  chatPending,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const displayAddress = profile?.public_wallet_address || profile?.external_wallet_address;

  return (
    <>
      {/* View As Banner */}
      {viewAsPublic && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 flex items-center justify-center gap-4 shadow-lg">
          <Eye className="w-5 h-5" />
          <span className="font-medium">{t('viewingAsOther')}</span>
          <Button size="sm" variant="secondary" onClick={() => onSetViewAsPublic(false)} className="ml-2">
            <X className="w-4 h-4 mr-1" />
            {t('exitViewMode')}
          </Button>
        </div>
      )}

      {/* Cover Photo */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-[2cm]">
        <div className="relative">
          <div className="h-[200px] sm:h-[210px] md:h-[280px] relative rounded-2xl mx-2 md:mx-0">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              {profile?.cover_url ? (
                <LazyImage src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" transformPreset="cover" priority />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/40 via-gold/30 to-primary/40" />
              )}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Honor Board Desktop */}
            <div className="absolute z-20 hidden md:block top-3 right-3 lg:top-4 lg:right-4 rounded-2xl p-1.5 bg-white/30 backdrop-blur-sm" style={{ width: 'clamp(320px, 34vw, 460px)' }}>
              <CoverHonorBoard userId={profile.id} username={profile?.username} avatarUrl={profile?.avatar_url ?? undefined} />
            </div>

            {/* Honor Board Mobile — moved below cover */}

            {showPrivateElements && (
              <div className="absolute bottom-3 right-3 md:right-auto md:left-[8cm] sm:bottom-4 sm:right-4 z-[100] isolate">
                <CoverPhotoEditor
                  userId={currentUserId}
                  currentCoverUrl={profile?.cover_url ?? undefined}
                  onCoverUpdated={(newUrl) => onSetProfile(prev => prev ? { ...prev, cover_url: newUrl } : prev)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Honor Board — below cover, above profile info */}
        <div className="md:hidden px-2 mt-2">
          <MobileStats userId={profile.id} username={profile?.username} avatarUrl={profile?.avatar_url ?? undefined} />
        </div>

        {/* Profile Info */}
        <div className="bg-card/80 border-b border-border shadow-sm md:rounded-b-xl">
          <div className="px-4 md:px-8 py-4 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Avatar */}
              <div className="-mt-[120px] sm:-mt-[130px] md:-mt-[217px] relative z-20 flex justify-center md:justify-start flex-shrink-0" style={{ overflow: 'visible' }}>
                <AvatarOrbit
                  key={profile?.id}
                  socialLinks={Array.isArray(profile?.social_links) ? profile.social_links : []}
                  isOwner={isOwnProfile}
                  userId={profile?.id}
                  onLinksChanged={(links) => onSetProfile(prev => prev ? { ...prev, social_links: links } : prev)}
                >
                  {showPrivateElements ? (
                    <AvatarEditor
                      userId={currentUserId}
                      currentAvatarUrl={profile?.avatar_url ?? undefined}
                      username={profile?.username}
                      onAvatarUpdated={(newUrl) => onSetProfile(prev => prev ? { ...prev, avatar_url: newUrl } : prev)}
                      size="large"
                    />
                  ) : (
                    <button className="rounded-full p-1 cursor-pointer" style={{ background: 'linear-gradient(135deg, #166534 0%, #22c55e 50%, #16a34a 100%)' }} onClick={() => onSetShowAvatarViewer(true)}>
                      <Avatar className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 border-4 border-white">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} sizeHint="lg" />}
                        <AvatarFallback className="text-3xl md:text-4xl bg-primary text-primary-foreground">
                          {profile?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  )}
                </AvatarOrbit>
              </div>

              {/* Name & Info */}
              <div className="flex-1 text-center md:text-left md:ml-4">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                  {profile?.display_name || profile?.username}
                </h1>
                {profile?.is_banned && (
                  <div className="mt-2 border-2 border-red-500 rounded-lg px-4 py-3 bg-red-50">
                    <p className="text-red-600 font-bold text-sm">Tài khoản bị cấm vĩnh viễn</p>
                    <p className="text-red-500 text-xs mt-0.5">Tài khoản này đã vi phạm điều khoản sử dụng và bị cấm vĩnh viễn.</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm font-bold text-green-600 mt-0.5">
                  <span>@{profile?.username}</span>
                  <span className="text-muted-foreground font-normal">·</span>
                  <a href={`https://fun.rich/${profile?.username}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors cursor-pointer">fun.rich/{profile?.username}</a>
                  <button type="button" onClick={() => { copyToClipboard(`https://fun.rich/${profile?.username}`).then(() => toast.success('Đã sao chép link hồ sơ!')).catch(() => toast.error('Không thể sao chép')); }} className="p-1.5 rounded hover:bg-muted text-primary touch-manipulation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>

                {/* Wallet Address */}
                {displayAddress ? (
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground font-mono font-medium">{displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}</span>
                    <button onClick={() => { copyToClipboard(displayAddress).then(() => toast.success(t('walletCopied'))); }} className="p-1 rounded hover:bg-primary/10 transition-colors">
                      <Copy className="w-3.5 h-3.5 text-primary hover:text-primary/80" />
                    </button>
                  </div>
                ) : showPrivateElements ? (
                  <button onClick={() => onNavigateToTab('edit')} className="flex items-center gap-2 mt-1 text-sm text-primary hover:underline">
                    <Wallet className="w-4 h-4" />{t('addPublicWallet')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Wallet className="w-4 h-4" /><span>{t('notUpdated')}</span>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-xs sm:text-sm text-green-700 mt-1 whitespace-pre-wrap break-words max-w-md">{profile.bio}</p>
                )}

                <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-4 mt-2 text-sm sm:text-base text-green-600 font-medium">
                  <div className="flex items-center gap-1.5 whitespace-nowrap"><MapPin className="w-5 h-5 flex-shrink-0" /><span>Việt Nam</span></div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap"><Briefcase className="w-5 h-5 flex-shrink-0" /><span>FUN Ecosystem</span></div>
                </div>

                {friendsPreview.length > 0 && (
                  <div className="hidden md:flex -space-x-2 mt-3">
                    {friendsPreview.slice(0, 6).map((friend) => (
                      <Avatar key={friend.id} className="w-8 h-8 border-2 border-card cursor-pointer hover:z-10 hover:scale-110 transition-transform" onClick={() => navigate(`/${friend.username}`)}>
                        <AvatarImage src={friend.avatar_url || undefined} sizeHint="sm" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-gold/30 text-foreground text-xs font-bold">
                          {(friend.full_name || friend.username)?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!viewAsPublic && (
                <div className="flex flex-wrap justify-center md:justify-end gap-2 pb-2">
                  {isOwnProfile ? (
                    <>
                      <Button variant="secondary" className="font-semibold px-4 h-10" onClick={() => onNavigateToTab('edit')}>
                        <PenSquare className="w-4 h-4 mr-2" />{t('editPersonalPage')}
                      </Button>
                      {isAdmin && (
                        <Button variant="outline" className="font-semibold px-4 h-10 border-primary/30 text-primary hover:bg-primary/10" onClick={() => navigate('/admin')}>
                          <Shield className="w-4 h-4 mr-2" />Admin
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <FriendRequestButton userId={profile.id} currentUserId={currentUserId} />
                      <Button variant="secondary" className="font-semibold px-4 h-10" onClick={onStartChat} disabled={chatPending}>
                        <MessageCircle className="w-4 h-4 mr-2" />{t('sendMessage')}
                      </Button>
                      <DonationButton
                        recipientId={profile.id}
                        recipientUsername={profile.username}
                        recipientDisplayName={profile.display_name}
                        recipientWalletAddress={profile.public_wallet_address || profile.external_wallet_address || profile.wallet_address}
                        recipientAvatarUrl={profile.avatar_url}
                        variant="profile"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
