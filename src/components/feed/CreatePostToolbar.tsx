/**
 * CreatePostToolbar — "Add to your post" icon bar
 * Extracted from FacebookCreatePost.tsx
 */
import { ImagePlus, UserPlus, MapPin, MoreHorizontal, Clapperboard } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { useLanguage } from '@/i18n/LanguageContext';

interface CreatePostToolbarProps {
  loading: boolean;
  taggedFriendsCount: number;
  hasLocation: boolean;
  onShowMediaUpload: () => void;
  onShowFriendTag: () => void;
  onShowLocation: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export const CreatePostToolbar = ({
  loading,
  taggedFriendsCount,
  hasLocation,
  onShowMediaUpload,
  onShowFriendTag,
  onShowLocation,
  onEmojiSelect,
}: CreatePostToolbarProps) => {
  const { t } = useLanguage();

  return (
    <div className="mt-4 border border-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{t('addToYourPost')}</span>
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onShowMediaUpload(); }}
            className="w-9 h-9 min-w-[36px] rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            disabled={loading}
            title={t('photoVideo')}
          >
            <ImagePlus className="w-6 h-6" style={{ color: '#45BD62' }} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onShowFriendTag(); }}
            className={`w-9 h-9 min-w-[36px] rounded-full hover:bg-secondary flex items-center justify-center transition-colors ${
              taggedFriendsCount > 0 ? 'bg-blue-100 dark:bg-blue-900/30' : ''
            }`}
            disabled={loading}
            title={t('tagFriends')}
          >
            <UserPlus className="w-6 h-6" style={{ color: '#1877F2' }} />
          </button>

          <EmojiPicker onEmojiSelect={onEmojiSelect} />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onShowLocation(); }}
            className={`w-9 h-9 min-w-[36px] rounded-full hover:bg-secondary flex items-center justify-center transition-colors ${
              hasLocation ? 'bg-red-100 dark:bg-red-900/30' : ''
            }`}
            disabled={loading}
            title="Check in"
          >
            <MapPin className="w-6 h-6" style={{ color: '#E74852' }} />
          </button>

          <button
            className="w-9 h-9 min-w-[36px] rounded-full hover:bg-secondary flex items-center justify-center transition-colors opacity-50 cursor-not-allowed"
            disabled
            title={t('gifComingSoon')}
          >
            <Clapperboard className="w-6 h-6" style={{ color: '#3BC7BD' }} />
          </button>

          <button
            className="w-9 h-9 min-w-[36px] rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            disabled={loading}
            title={t('more')}
          >
            <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
