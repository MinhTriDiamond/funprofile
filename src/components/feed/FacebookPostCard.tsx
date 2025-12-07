import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CommentSection } from './CommentSection';
import { ImageViewer } from './ImageViewer';
import { EditPostDialog } from './EditPostDialog';
import {
  ThumbsUp,
  Heart,
  Laugh,
  Frown,
  Angry,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  Trash2,
  Pencil,
  Link2,
  Bookmark,
} from 'lucide-react';

interface FacebookPostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    video_url?: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
  onPostDeleted: () => void;
}

export const FacebookPostCard = ({ post, currentUserId, onPostDeleted }: FacebookPostCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [showReactions, setShowReactions] = useState(false);

  useEffect(() => {
    const fetchPostData = async () => {
      const { data: reactions } = await supabase
        .from('reactions')
        .select('id, user_id')
        .eq('post_id', post.id)
        .is('comment_id', null);
      
      if (reactions) {
        setLikeCount(reactions.length);
        setLiked(reactions.some((r) => r.user_id === currentUserId));
      }

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      setCommentCount(commentsCount || 0);

      const { count: sharesCount } = await supabase
        .from('shared_posts')
        .select('*', { count: 'exact', head: true })
        .eq('original_post_id', post.id);
      
      setShareCount(sharesCount || 0);
    };

    fetchPostData();
  }, [post.id, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    try {
      if (liked) {
        await supabase
          .from('reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
          .is('comment_id', null);
        
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await supabase.from('reactions').insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error('Không thể cập nhật reaction');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      toast.success('Đã xóa bài viết');
      onPostDeleted();
    } catch (error: any) {
      toast.error('Không thể xóa bài viết');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép link!');
  };

  const handleShareToProfile = async () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để chia sẻ');
      return;
    }

    try {
      const { error } = await supabase.from('shared_posts').insert({
        user_id: currentUserId,
        original_post_id: post.id,
      });

      if (error) throw error;
      setShareCount(prev => prev + 1);
      toast.success('Đã chia sẻ bài viết!');
    } catch (error: any) {
      toast.error('Không thể chia sẻ');
    }
  };

  const reactions = [
    { icon: '👍', label: 'Thích', color: 'text-blue-500' },
    { icon: '❤️', label: 'Yêu thích', color: 'text-red-500' },
    { icon: '😆', label: 'Haha', color: 'text-yellow-500' },
    { icon: '😮', label: 'Wow', color: 'text-yellow-500' },
    { icon: '😢', label: 'Buồn', color: 'text-yellow-500' },
    { icon: '😠', label: 'Phẫn nộ', color: 'text-orange-500' },
  ];

  return (
    <>
      <div className="fb-card mb-4">
        {/* Post Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar
              className="w-10 h-10 cursor-pointer"
              onClick={() => navigate(`/profile/${post.user_id}`)}
            >
              <AvatarImage src={post.profiles.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.profiles.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3
                className="font-semibold cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${post.user_id}`)}
              >
                {post.profiles.username}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(post.created_at), { 
                    addSuffix: true,
                    locale: vi 
                  })}
                </span>
                <span>·</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem className="cursor-pointer">
                <Bookmark className="w-5 h-5 mr-3" />
                Lưu bài viết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                <Link2 className="w-5 h-5 mr-3" />
                Sao chép liên kết
              </DropdownMenuItem>
              {post.user_id === currentUserId && (
                <>
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)} className="cursor-pointer">
                    <Pencil className="w-5 h-5 mr-3" />
                    Chỉnh sửa bài viết
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-destructive">
                    <Trash2 className="w-5 h-5 mr-3" />
                    Xóa bài viết
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )}

        {/* Post Media */}
        {post.image_url && (
          <div className="cursor-pointer" onClick={() => setShowImageViewer(true)}>
            <img
              src={post.image_url}
              alt="Post"
              loading="lazy"
              className="w-full max-h-[600px] object-contain bg-black"
            />
          </div>
        )}

        {post.video_url && (
          <video
            controls
            preload="metadata"
            className="w-full max-h-[600px]"
            src={post.video_url}
          />
        )}

        {/* Reactions Summary */}
        {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
          <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {likeCount > 0 && (
                <>
                  <div className="flex -space-x-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">👍</span>
                    <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs">❤️</span>
                  </div>
                  <span className="ml-1">{likeCount}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {commentCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="hover:underline"
                >
                  {commentCount} bình luận
                </button>
              )}
              {shareCount > 0 && <span>{shareCount} lượt chia sẻ</span>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-border mx-4">
          <div className="flex items-center py-1">
            <div
              className="relative flex-1"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <button
                onClick={handleLike}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors hover:bg-secondary ${
                  liked ? 'text-blue-500' : 'text-muted-foreground'
                }`}
              >
                <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                <span className="font-semibold text-sm">Thích</span>
              </button>

              {/* Reactions Popup */}
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 bg-card rounded-full shadow-lg border border-border p-1 flex gap-1 reaction-pop">
                  {reactions.map((reaction, index) => (
                    <button
                      key={index}
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform"
                      onClick={handleLike}
                    >
                      {reaction.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors hover:bg-secondary text-muted-foreground"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Bình luận</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors hover:bg-secondary text-muted-foreground">
                  <Share2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">Chia sẻ</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={handleShareToProfile} className="cursor-pointer">
                  Chia sẻ lên trang cá nhân
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                  Sao chép liên kết
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border px-4 py-3">
            <CommentSection
              postId={post.id}
              onCommentAdded={() => setCommentCount(prev => prev + 1)}
            />
          </div>
        )}
      </div>

      <ImageViewer
        imageUrl={post.image_url || ''}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
      />

      <EditPostDialog
        post={post}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onPostUpdated={onPostDeleted}
      />
    </>
  );
};
