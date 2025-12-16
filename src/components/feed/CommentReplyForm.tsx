import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Send, X, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { CommentMediaUpload } from './CommentMediaUpload';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmojiPicker } from './EmojiPicker';

const replySchema = z.object({
  content: z.string().max(1000, 'Trả lời không được quá 1000 ký tự'),
});

interface CommentReplyFormProps {
  postId: string;
  parentCommentId: string;
  onReplyAdded: () => void;
  onCancel: () => void;
}

export const CommentReplyForm = ({ 
  postId, 
  parentCommentId, 
  onReplyAdded, 
  onCancel 
}: CommentReplyFormProps) => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ avatar_url: string | null; username: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setCurrentUser(profile);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl) return;

    const validation = replySchema.safeParse({ content: content.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Vui lòng đăng nhập để trả lời');
      setLoading(false);
      return;
    }

    const insertData: any = {
      post_id: postId,
      user_id: user.id,
      content: content.trim() || '',
      parent_comment_id: parentCommentId,
    };

    if (mediaUrl) {
      if (mediaType === 'image') {
        insertData.image_url = mediaUrl;
      } else if (mediaType === 'video') {
        insertData.video_url = mediaUrl;
      }
    }

    const { error } = await supabase
      .from('comments')
      .insert(insertData);

    if (error) {
      toast.error('Không thể đăng trả lời');
    } else {
      setContent('');
      setMediaUrl(null);
      setMediaType(null);
      onReplyAdded();
      toast.success('Đã đăng trả lời!');
    }
    setLoading(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start animate-scale-in">
      <Avatar className="w-8 h-8 ring-2 ring-primary/20 shrink-0">
        {currentUser?.avatar_url ? (
          <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
        ) : (
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-semibold">
            {currentUser?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết trả lời..."
            className="w-full min-h-[50px] max-h-[120px] px-3 py-2 bg-white border-2 border-primary/30 rounded-xl resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/60"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>

        {/* Media Preview */}
        {mediaUrl && (
          <div className="relative inline-block">
            {mediaType === 'image' ? (
              <img src={mediaUrl} alt="Preview" className="max-h-24 rounded-lg border-2 border-primary/20" />
            ) : (
              <video src={mediaUrl} className="max-h-24 rounded-lg border-2 border-primary/20" />
            )}
            <button
              type="button"
              onClick={() => { setMediaUrl(null); setMediaType(null); }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs hover:bg-destructive/80"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <CommentMediaUpload
              onMediaUploaded={(url, type) => {
                setMediaUrl(url);
                setMediaType(type);
              }}
              onMediaRemoved={() => {
                setMediaUrl(null);
                setMediaType(null);
              }}
            />
            
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 h-8 w-8 p-0"
              >
                <Smile className="w-4 h-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
              disabled={loading}
              className="h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              disabled={loading || (!content.trim() && !mediaUrl)}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold px-4 rounded-full shadow-md shadow-yellow-400/20 hover:shadow-yellow-500/30 transition-all duration-300 h-8"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
