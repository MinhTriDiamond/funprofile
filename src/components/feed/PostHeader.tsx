import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  MoreHorizontal, Globe, Trash2, Pencil, Link2, Bookmark, Pin, PinOff, Users, Lock,
} from 'lucide-react';
import type { PostData } from './types';

interface PostHeaderProps {
  post: PostData;
  currentUserId: string;
  isPinned: boolean;
  canShowPinOption: boolean;
  isDeleting: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPinPost?: (postId: string) => void;
  onUnpinPost?: () => void;
}

export const PostHeader = memo(function PostHeader({
  post, currentUserId, isPinned, canShowPinOption, isDeleting,
  onCopyLink, onEdit, onDelete, onPinPost, onUnpinPost,
}: PostHeaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex items-start justify-between p-4">
      <div className="flex items-center gap-3">
        <Avatar
          className="w-10 h-10 cursor-pointer ring-2 ring-primary/20"
          onClick={() => navigate(`/profile/${post.user_id}`)}
        >
          <AvatarImage src={post.profiles?.avatar_url || ''} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {post.profiles?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3
            className="font-semibold cursor-pointer hover:underline"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            {post.profiles?.display_name || post.profiles?.username}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
            </span>
            <span>·</span>
            {post.visibility === 'private' ? (
              <Lock className="w-3 h-3" />
            ) : post.visibility === 'friends' ? (
              <Users className="w-3 h-3" />
            ) : (
              <Globe className="w-3 h-3" />
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem className="cursor-pointer gap-3">
            <Bookmark className="w-5 h-5" />
            {t('savePost')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyLink} className="cursor-pointer gap-3">
            <Link2 className="w-5 h-5" />
            {t('copyLink')}
          </DropdownMenuItem>
          {canShowPinOption && (
            isPinned ? (
              <DropdownMenuItem onClick={onUnpinPost} className="cursor-pointer gap-3">
                <PinOff className="w-5 h-5" />
                {t('unpinPost')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onPinPost?.(post.id)} className="cursor-pointer gap-3">
                <Pin className="w-5 h-5" />
                {t('pinPost')}
              </DropdownMenuItem>
            )
          )}
          {post.user_id === currentUserId && (
            <>
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-3">
                <Pencil className="w-5 h-5" />
                {t('editPost')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); onDelete(); }}
                disabled={isDeleting}
                className="cursor-pointer text-destructive gap-3"
              >
                <Trash2 className="w-5 h-5" />
                {isDeleting ? t('deleting') : t('deletePost')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
