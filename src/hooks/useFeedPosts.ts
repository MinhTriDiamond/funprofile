import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

export interface FeedPost {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface FeedData {
  posts: FeedPost[];
  postStats: Record<string, PostStats>;
}

// Batch fetch all post stats in parallel
const fetchPostStats = async (postIds: string[]): Promise<Record<string, PostStats>> => {
  if (postIds.length === 0) return {};

  const [reactionsRes, commentsRes, sharesRes] = await Promise.all([
    supabase
      .from('reactions')
      .select('id, user_id, type, post_id')
      .in('post_id', postIds)
      .is('comment_id', null),
    supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds),
    supabase
      .from('shared_posts')
      .select('original_post_id')
      .in('original_post_id', postIds),
  ]);

  const stats: Record<string, PostStats> = {};

  postIds.forEach(postId => {
    const postReactions = reactionsRes.data?.filter(r => r.post_id === postId) || [];
    const postComments = commentsRes.data?.filter(c => c.post_id === postId) || [];
    const postShares = sharesRes.data?.filter(s => s.original_post_id === postId) || [];

    stats[postId] = {
      reactions: postReactions.map(r => ({ id: r.id, user_id: r.user_id, type: r.type })),
      commentCount: postComments.length,
      shareCount: postShares.length,
    };
  });

  return stats;
};

// Main fetch function
const fetchFeedData = async (): Promise<FeedData> => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`*, profiles!posts_user_id_fkey (username, avatar_url)`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const postsData = posts || [];
  const postIds = postsData.map(p => p.id);
  const postStats = await fetchPostStats(postIds);

  return { posts: postsData, postStats };
};

export const useFeedPosts = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['feed-posts'],
    queryFn: fetchFeedData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
  }, [queryClient]);

  // Subscribe to realtime updates for posts
  useEffect(() => {
    const channel = supabase
      .channel('feed-posts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          // Invalidate cache on post changes
          queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    posts: query.data?.posts || [],
    postStats: query.data?.postStats || {},
    isLoading: query.isLoading,
    refetch,
  };
};
