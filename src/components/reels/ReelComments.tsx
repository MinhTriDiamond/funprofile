import { useState } from 'react';
import { useReelComments } from '@/hooks/useReels';
import { useLanguage } from '@/i18n/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { useReels } from '@/hooks/useReels';
import { formatDistanceToNow } from 'date-fns';

interface ReelCommentsProps {
  reelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReelComments = ({ reelId, open, onOpenChange }: ReelCommentsProps) => {
  const { t } = useLanguage();
  const { data: comments = [], isLoading } = useReelComments(open ? reelId : null);
  const { addComment, currentUser } = useReels();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      { reelId, content: newComment.trim(), parentCommentId: replyTo || undefined },
      { onSuccess: () => { setNewComment(''); setReplyTo(null); } }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl bg-background">
        <SheetHeader className="pb-2">
          <SheetTitle>{t('comments')} ({comments.length})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pb-20 px-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('reelNoComments')}</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">{comment.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <p className="font-semibold text-sm">{comment.profiles?.username}</p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-1 px-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    <button className="text-xs text-muted-foreground hover:text-foreground">{t('like')}</button>
                    <button
                      onClick={() => setReplyTo(comment.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('reply')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        {currentUser && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                <span>{t('reelReplyingTo')}...</span>
                <button onClick={() => setReplyTo(null)}><X className="w-3 h-3" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('reelAddComment')}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ReelComments;
