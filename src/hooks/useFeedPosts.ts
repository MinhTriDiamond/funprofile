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
  media_urls: Array<{ url: string; type: 'image' | 'video' }> | null;
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

  try {
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

    // Log errors but don't throw - gracefully handle partial data
    if (reactionsRes.error) console.error('Reactions fetch error:', reactionsRes.error);
    if (commentsRes.error) console.error('Comments fetch error:', commentsRes.error);
    if (sharesRes.error) console.error('Shares fetch error:', sharesRes.error);

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
  } catch (error) {
    console.error('Error fetching post stats:', error);
    // Return empty stats for all posts on error
    return postIds.reduce((acc, id) => {
      acc[id] = { reactions: [], commentCount: 0, shareCount: 0 };
      return acc;
    }, {} as Record<string, PostStats>);
  }
};

// Main fetch function
const fetchFeedData = async (): Promise<FeedData> => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`*, profiles!posts_user_id_fkey (username, avatar_url)`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  // Cast media_urls from Json to proper type
  const postsData: FeedPost[] = (posts || []).map(post => ({
    ...post,
    media_urls: (post.media_urls as Array<{ url: string; type: 'image' | 'video' }>) || null,
  }));
  
  const postIds = postsData.map(p => p.id);
  const postStats = await fetchPostStats(postIds);

  return { posts: postsData, postStats };
};

export const useFeedPosts = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['feed-posts'],
    queryFn: fetchFeedData,
    staleTime: 30 * 1000, // 30 seconds - more responsive to changes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2, // Retry failed requests
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
