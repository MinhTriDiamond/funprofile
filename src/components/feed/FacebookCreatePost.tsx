/**
 * CreatePost — Compose UI + Dialog shell
 * Logic extracted to useCreatePost, media to CreatePostMediaManager, toolbar to CreatePostToolbar
 */
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ImagePlus, Video, Loader2, ShieldAlert } from 'lucide-react';
import { UploadQueue, UploadItem } from '@/utils/uploadQueue';
import { EmojiPicker } from './EmojiPicker';
import { FriendTagDialog } from './FriendTagDialog';
import { LocationCheckin } from './LocationCheckin';
import { PrivacySelector } from './PrivacySelector';
import { FeelingActivityDialog, FeelingActivity } from './FeelingActivityDialog';
import { CreatePostMediaManager, UppyVideoResult } from './CreatePostMediaManager';
import { CreatePostToolbar } from './CreatePostToolbar';
import { useCreatePost } from '@/hooks/useCreatePost';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';

interface FacebookCreatePostProps {
  onPostCreated: () => void;
}

export const CreatePost = ({ onPostCreated }: FacebookCreatePostProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { canCreatePost, isLimitedAccount, isLoading: capLoading } = useAccountCapabilities();

  // Upload queue ref shared between hook and media manager
  const uploadQueueRef = useRef<UploadQueue | null>(null);

  const {
    profile, fetchProfile,
    content, setContent,
    loading,
    privacy, setPrivacy,
    taggedFriends, setTaggedFriends,
    location, setLocation,
    feeling, setFeeling,
    submitStep,
    getSubmitButtonText,
    handleCancelSubmit,
    handleSubmit,
    MAX_CONTENT_LENGTH,
  } = useCreatePost({ onPostCreated, uploadQueueRef });

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showFriendTagDialog, setShowFriendTagDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showFeelingDialog, setShowFeelingDialog] = useState(false);

  // Media state
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uppyVideoResult, setUppyVideoResult] = useState<UppyVideoResult | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // File input ref
  const photoVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleEmojiSelect = (emoji: string) => setContent((prev) => prev + emoji);

  const handleFeelingSelect = (selectedFeeling: FeelingActivity) => {
    setFeeling(selectedFeeling);
    setIsDialogOpen(true);
  };

  const handlePhotoVideoClick = () => photoVideoInputRef.current?.click();
  const handleLiveVideoClick = () => navigate('/live/setup');

  const mediaManagerRef = useRef<{ handleFileSelect: (files: FileList | null) => void }>(null);

  const handleDirectFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsDialogOpen(true);
    setShowMediaUpload(true);
    // Forward files to the media manager's file handler
    mediaManagerRef.current?.handleFileSelect(files);
  };

  const doSubmit = async () => {
    await handleSubmit({
      uploadItems,
      uppyVideoResult,
      isVideoUploading,
      onSuccess: () => {
        setUppyVideoResult(null);
        setPendingVideoFile(null);
        setIsVideoUploading(false);
        setIsDialogOpen(false);
        setShowMediaUpload(false);
      },
    });
  };

  // Guest mode
  if (!profile) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-muted text-muted-foreground">G</AvatarFallback>
          </Avatar>
          <button
            onClick={() => toast.error(t('loginToPostMessage'), { action: { label: t('loginButton'), onClick: () => navigate('/auth') } })}
            className="flex-1 text-left px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground text-[15px] transition-colors"
          >
            {t('whatsOnYourMind')}
          </button>
        </div>
        <div className="border-t border-border mt-3 pt-2">
          <div className="flex items-center">
            {[
              { icon: <Video className="w-6 h-6 text-destructive" />, label: t('liveVideo') },
              { icon: <ImagePlus className="w-6 h-6 text-[#45BD62]" />, label: t('photoVideo') },
              { icon: <span className="text-xl sm:text-2xl">😊</span>, label: t('feeling') },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => toast.error(t('loginToPostMessage'), { action: { label: t('loginButton'), onClick: () => navigate('/auth') } })}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group"
              >
                {btn.icon}
                <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Limited account — cannot create posts
  if (!canCreatePost && !capLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20 shrink-0">
            <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 px-4 py-2.5 bg-muted rounded-full text-muted-foreground text-[15px]">
            {language === 'vi'
              ? 'Liên kết và xác thực email để đăng bài'
              : 'Verify your email to start posting'}
          </div>
        </div>
        <div className="border-t border-border mt-3 pt-3">
          <div className="flex items-center gap-2 px-2">
            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {language === 'vi'
                ? 'Tài khoản của bạn cần xác thực email để mở khóa quyền đăng bài, bình luận và tương tác.'
                : 'Your account needs email verification to unlock posting, commenting and interactions.'}
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/settings/security')}
              className="shrink-0"
            >
              {language === 'vi' ? 'Liên kết email' : 'Verify Email'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={photoVideoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => handleDirectFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Create Post Card */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            className="w-10 h-10 cursor-pointer ring-2 ring-primary/20 shrink-0"
            onClick={() => navigate(`/profile/${profile.id}`)}
          >
            <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex-1 text-left px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground text-[15px] transition-colors"
          >
            {language === 'vi'
              ? `${profile.display_name || profile.username} ơi, Ánh sáng trong tim bạn đang muốn nói điều gì?`
              : `What's on your mind, ${profile.display_name || profile.username}?`}
          </button>
        </div>
        <div className="border-t border-border mt-3 pt-2">
          <div className="flex items-center">
            <button onClick={handleLiveVideoClick} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <Video className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{t('liveVideo')}</span>
            </button>
            <button onClick={handlePhotoVideoClick} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <ImagePlus className="w-6 h-6 text-[#45BD62] group-hover:scale-110 transition-transform" />
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{t('photoVideo')}</span>
            </button>
            <button onClick={() => setShowFeelingDialog(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">{feeling ? feeling.emoji : '😊'}</span>
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{feeling ? feeling.label : t('feeling')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="text-center text-xl font-bold">{t('createPost')}</DialogTitle>
          </DialogHeader>

          <div className="p-4 flex-1 overflow-y-auto">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
                <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-semibold">{profile.display_name || profile.username}</span>
                  {feeling && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('feelingPrefix')}{' '}
                      <button onClick={() => setShowFeelingDialog(true)} className="text-foreground font-semibold hover:underline inline-flex items-center gap-1">
                        {feeling.emoji} {feeling.label}
                      </button>
                    </span>
                  )}
                  {taggedFriends.length > 0 && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('withPrefix')}{' '}
                      <button onClick={() => setShowFriendTagDialog(true)} className="text-foreground font-semibold hover:underline">
                        {taggedFriends.length === 1
                          ? (taggedFriends[0].full_name || taggedFriends[0].username)
                          : `${taggedFriends[0].full_name || taggedFriends[0].username} ${t('andOthers')} ${taggedFriends.length - 1}`}
                      </button>
                    </span>
                  )}
                  {location && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('atPrefix')}{' '}
                      <button onClick={() => setShowLocationDialog(true)} className="text-foreground font-semibold hover:underline">{location}</button>
                    </span>
                  )}
                </div>
                <PrivacySelector value={privacy} onChange={setPrivacy} disabled={loading} />
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              <Textarea
                placeholder={`${profile.display_name || profile.username} ơi, Ánh sáng trong tim bạn đang muốn nói điều gì?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground pr-10"
                disabled={loading}
              />
              <div className="absolute bottom-2 right-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
              <div className={`text-xs text-right mt-1 pr-1 ${
                content.length > MAX_CONTENT_LENGTH ? 'text-destructive font-semibold' :
                content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-500' :
                content.length > MAX_CONTENT_LENGTH * 0.8 ? 'text-yellow-600/70' : 'text-muted-foreground'
              }`}>
                {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
              </div>
            </div>

            {/* Media Manager */}
            <CreatePostMediaManager
              ref={mediaManagerRef}
              loading={loading}
              showMediaUpload={showMediaUpload}
              setShowMediaUpload={setShowMediaUpload}
              uploadQueueRef={uploadQueueRef}
              uploadItems={uploadItems}
              setUploadItems={setUploadItems}
              pendingVideoFile={pendingVideoFile}
              setPendingVideoFile={setPendingVideoFile}
              uppyVideoResult={uppyVideoResult}
              setUppyVideoResult={setUppyVideoResult}
              isVideoUploading={isVideoUploading}
              setIsVideoUploading={setIsVideoUploading}
            />

            {/* Toolbar */}
            <CreatePostToolbar
              loading={loading}
              taggedFriendsCount={taggedFriends.length}
              hasLocation={!!location}
              onShowMediaUpload={() => setShowMediaUpload(true)}
              onShowFriendTag={() => setShowFriendTagDialog(true)}
              onShowLocation={() => setShowLocationDialog(true)}
              onEmojiSelect={handleEmojiSelect}
            />
          </div>

          {/* Submit */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              {loading && (
                <Button variant="outline" onClick={handleCancelSubmit} className="shrink-0">{t('cancelButton')}</Button>
              )}
              <Button
                onClick={doSubmit}
                disabled={loading || isVideoUploading || content.length > MAX_CONTENT_LENGTH || (!content.trim() && uploadItems.length === 0 && !uppyVideoResult)}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {(loading || isVideoUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {getSubmitButtonText(isVideoUploading)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FriendTagDialog isOpen={showFriendTagDialog} onClose={() => setShowFriendTagDialog(false)} currentUserId={profile?.id || ''} selectedFriends={taggedFriends} onTagFriends={setTaggedFriends} />
      <LocationCheckin isOpen={showLocationDialog} onClose={() => setShowLocationDialog(false)} currentLocation={location} onSelectLocation={setLocation} />
      <FeelingActivityDialog isOpen={showFeelingDialog} onClose={() => setShowFeelingDialog(false)} onSelect={handleFeelingSelect} />
    </>
  );
};
