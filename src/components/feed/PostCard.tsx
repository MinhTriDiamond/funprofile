import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Trash2, Redo, MessageCircle, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { CommentSection } from './CommentSection';
import { ImageViewer } from './ImageViewer';
import { EditPostDialog } from './EditPostDialog';

interface PostCardProps {
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

export const PostCard = ({ post, currentUserId, onPostDeleted }: PostCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  // Fetch reactions and comments count
  useEffect(() => {
    const fetchPostData = async () => {
      // Fetch reactions
      const { data: reactions } = await supabase
        .from('reactions')
        .select('id, user_id')
        .eq('post_id', post.id)
        .is('comment_id', null);
      
      if (reactions) {
        setLikeCount(reactions.length);
        setLiked(reactions.some((r) => r.user_id === currentUserId));
      }

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      setCommentCount(commentsCount || 0);

      // Fetch share count
      const { count: sharesCount } = await supabase
        .from('shared_posts')
        .select('*', { count: 'exact', head: true })
        .eq('original_post_id', post.id);
      
      setShareCount(sharesCount || 0);
    };

    fetchPostData();
  }, [post.id, currentUserId]);

  const handleLike = async () => {
    try {
      if (liked) {
        // Delete the reaction
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
      toast.error('Failed to update reaction');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      toast.success('Post deleted');
      onPostDeleted();
    } catch (error: any) {
      toast.error('Failed to delete post');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép link!');
  };

  const handleShareToProfile = async () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để share post');
      return;
    }

    try {
      const { error } = await supabase.from('shared_posts').insert({
        user_id: currentUserId,
        original_post_id: post.id,
      });

      if (error) throw error;
      setShareCount(prev => prev + 1);
      toast.success('Đã share post về profile của bạn!');
    } catch (error: any) {
      toast.error('Không thể share post');
    }
  };

  const handleProfileClick = () => {
    navigate(`/profile/${post.user_id}`);
  };

  return (
    <>
      <div className="glass-card rounded-2xl mb-4 hover:shadow-xl transition-all">
        <div className="flex flex-row items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b-2 border-gold">
          <Avatar className="cursor-pointer w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-gold" onClick={handleProfileClick}>
            {post.profiles.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
            <AvatarFallback className="bg-gold/20 text-primary font-display">{post.profiles.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold cursor-pointer hover:text-primary-glow transition-colors text-sm sm:text-base truncate text-primary" 
              onClick={handleProfileClick}
            >
              {post.profiles.username}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="space-y-4 px-4 sm:px-6 py-4">
          {post.content && <p className="whitespace-pre-wrap text-sm sm:text-base break-words text-foreground">{post.content}</p>}
          
          {post.image_url && (
            <>
              <img
                src={post.image_url}
                alt="Post"
                loading="lazy"
                className="w-full max-w-[1920px] max-h-[1920px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain mx-auto border-2 border-gold"
                onClick={() => setShowImageViewer(true)}
              />
              <ImageViewer
                imageUrl={post.image_url}
                isOpen={showImageViewer}
                onClose={() => setShowImageViewer(false)}
              />
            </>
          )}

          {post.video_url && (
            <video
              controls
              preload="metadata"
              className="w-full max-w-[1920px] rounded-lg mx-auto border-2 border-gold"
              src={post.video_url}
            >
              Your browser does not support video playback.
            </video>
          )}
        </div>
        <div className="flex flex-col gap-4 px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-gold">
          <div className="flex items-center gap-2 sm:gap-4 w-full flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${liked ? 'text-destructive' : 'text-primary'} text-xs sm:text-sm hover:text-primary-glow hover:bg-primary/10`}
            >
              <Heart className={`w-4 h-4 mr-1 sm:mr-2 ${liked ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{likeCount}</span>
              <span className="sm:hidden">{likeCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-xs sm:text-sm text-primary hover:text-primary-glow hover:bg-primary/10"
            >
              <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{commentCount}</span>
              <span className="sm:hidden">{commentCount}</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm gap-1 text-primary hover:text-primary-glow hover:bg-primary/10">
                  <Redo className="w-4 h-4 sm:w-5 sm:h-5" />
                  {shareCount > 0 && <span>{shareCount}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="glass-card">
                <DropdownMenuItem onClick={handleCopyLink} className="text-foreground hover:text-primary">
                  Sao chép link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareToProfile} className="text-foreground hover:text-primary">
                  Share về profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {post.user_id === currentUserId && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(true)} className="text-xs sm:text-sm text-primary hover:text-primary-glow hover:bg-primary/10">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-xs sm:text-sm ml-auto text-primary hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          {showComments && (
            <CommentSection postId={post.id} onCommentAdded={() => setCommentCount(prev => prev + 1)} />
          )}
        </div>
      </div>
      
      <EditPostDialog
        post={post}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onPostUpdated={onPostDeleted}
      />
    </>
  );
};
