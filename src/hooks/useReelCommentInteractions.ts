import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useReelCommentInteractions() {
  const queryClient = useQueryClient();

  const toggleCommentLike = useMutation({
    mutationFn: async ({ commentId, isLiked, userId }: { commentId: string; isLiked: boolean; userId: string }) => {
      if (isLiked) {
        await supabase.from('reel_comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
      } else {
        await supabase.from('reel_comment_likes').insert({ comment_id: commentId, user_id: userId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel-comments'] }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('reel_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel-comments'] }),
  });

  return { toggleCommentLike, deleteComment };
}
