import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
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
  visibility: string;
  post_type?: string;
  tx_hash?: string | null;
  gift_sender_id?: string | null;
  gift_recipient_id?: string | null;
  gift_token?: string | null;
  gift_amount?: string | null;
  gift_message?: string | null;
  is_highlighted?: boolean;
  highlight_expires_at?: string | null;
  profiles: {
    username: string;
    display_name?: string | null;
    avatar_url: string | null;
    external_wallet_address?: string | null;
    custodial_wallet_address?: string | null;
  };
}

interface FeedPage {
  posts: FeedPost[];
  postStats: Record<string, PostStats>;
  nextCursor: string | null;
}

const POSTS_PER_PAGE = 10;

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
    return postIds.reduce((acc, id) => {
      acc[id] = { reactions: [], commentCount: 0, shareCount: 0 };
      return acc;
    }, {} as Record<string, PostStats>);
  }
};

// Fetch a page of posts with cursor-based pagination
// Fetch highlighted (pinned) gift celebration posts
const fetchHighlightedPosts = async (currentUserId: string | null): Promise<FeedPost[]> => {
  const now = new Date().toISOString();
  let query = supabase
    .from('posts')
    .select(`*, profiles!posts_user_id_fkey (username, display_name, avatar_url, external_wallet_address, custodial_wallet_address, public_wallet_address, wallet_address)`)
    .eq('is_highlighted', true)
    .gt('highlight_expires_at', now)
    .order('created_at', { ascending: false })
    .limit(10);

  if (currentUserId) {
    query = query.or(`moderation_status.eq.approved,user_id.eq.${currentUserId}`);
  } else {
    query = query.eq('moderation_status', 'approved');
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching highlighted posts:', error);
    return [];
  }

  return (data || []).map(post => ({
    ...post,
    media_urls: (post.media_urls as Array<{ url: string; type: 'image' | 'video' }>) || null,
    visibility: post.visibility || 'public',
  }));
};

const fetchFeedPage = async (cursor: string | null, currentUserId: string | null): Promise<FeedPage> => {
  let query = supabase
    .from('posts')
    .select(`*, profiles!posts_user_id_fkey (username, display_name, avatar_url, external_wallet_address, custodial_wallet_address, public_wallet_address, wallet_address)`)
    .order('created_at', { ascending: false })
    .limit(POSTS_PER_PAGE + 1);

  // Only show approved posts + own posts (so author doesn't know they're pending)
  if (currentUserId) {
    query = query.or(`moderation_status.eq.approved,user_id.eq.${currentUserId}`);
  } else {
    query = query.eq('moderation_status', 'approved');
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: posts, error } = await query;

  if (error) throw error;

  const hasMore = (posts?.length || 0) > POSTS_PER_PAGE;
  const postsToReturn = hasMore ? posts?.slice(0, POSTS_PER_PAGE) : posts;

  const postsData: FeedPost[] = (postsToReturn || []).map(post => ({
    ...post,
    media_urls: (post.media_urls as Array<{ url: string; type: 'image' | 'video' }>) || null,
    visibility: post.visibility || 'public',
  }));
  
  const postIds = postsData.map(p => p.id);
  const postStats = await fetchPostStats(postIds);

  const nextCursor = hasMore && postsData.length > 0 
    ? postsData[postsData.length - 1].created_at 
    : null;

  return { posts: postsData, postStats, nextCursor };
};

export const useFeedPosts = () => {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const query = useInfiniteQuery<FeedPage, Error>({
    queryKey: ['feed-posts', currentUserId],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as string | null, currentUserId),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: currentUserId !== undefined,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
  }, [queryClient]);

  // Listen for invalidate-feed event (dispatched after donation)
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] });
    };
    window.addEventListener('invalidate-feed', handler);
    return () => window.removeEventListener('invalidate-feed', handler);
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('feed-posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch highlighted posts separately (only on first page)
  const highlightedQuery = useInfiniteQuery<{ posts: FeedPost[]; postStats: Record<string, PostStats> }, Error>({
    queryKey: ['highlighted-posts', currentUserId],
    queryFn: async () => {
      const posts = await fetchHighlightedPosts(currentUserId);
      const postIds = posts.map(p => p.id);
      const postStats = await fetchPostStats(postIds);
      return { posts, postStats };
    },
    initialPageParam: null,
    getNextPageParam: () => undefined,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: currentUserId !== undefined,
  });

  const highlightedPosts = highlightedQuery.data?.pages?.[0]?.posts || [];
  const highlightedStats = highlightedQuery.data?.pages?.[0]?.postStats || {};
  const highlightedIds = new Set(highlightedPosts.map(p => p.id));

  const regularPosts = (query.data?.pages?.flatMap(page => page.posts) || [])
    .filter(p => !highlightedIds.has(p.id));

  const allPosts = [...highlightedPosts, ...regularPosts];
  const allPostStats = {
    ...highlightedStats,
    ...(query.data?.pages?.reduce((acc, page) => {
      return { ...acc, ...page.postStats };
    }, {} as Record<string, PostStats>) || {}),
  };

  return {
    posts: allPosts,
    postStats: allPostStats,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch,
  };
};
