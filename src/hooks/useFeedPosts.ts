import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getVNTodayRange } from '@/lib/vnTimezone';

export interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

export interface GiftProfile {
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
}

export interface PostAttachmentData {
  id: string;
  file_url: string;
  storage_key: string | null;
  file_type: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sort_order: number;
  alt_text: string | null;
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
    public_wallet_address?: string | null;
    is_banned?: boolean;
  };
  recipientProfile?: GiftProfile | null;
  senderProfile?: GiftProfile | null;
  attachments?: PostAttachmentData[];
}

interface FeedPage {
  posts: FeedPost[];
  postStats: Record<string, PostStats>;
  nextCursor: string | null;
}

const POSTS_PER_PAGE = 10;

// Batch fetch all post stats via server-side aggregation
const fetchPostStats = async (postIds: string[]): Promise<Record<string, PostStats>> => {
  if (postIds.length === 0) return {};

  try {
    const { data, error } = await supabase.rpc('get_post_stats', { p_post_ids: postIds });

    if (error) {
      console.error('Post stats RPC error:', error);
      throw error;
    }

    const stats: Record<string, PostStats> = {};
    (data || []).forEach((row: any) => {
      const reactions = Array.isArray(row.reactions) ? row.reactions : [];
      stats[row.post_id] = {
        reactions: reactions.map((r: any) => ({ id: r.id, user_id: r.user_id, type: r.type })),
        commentCount: Number(row.comment_count) || 0,
        shareCount: Number(row.share_count) || 0,
      };
    });

    postIds.forEach(id => {
      if (!stats[id]) {
        stats[id] = { reactions: [], commentCount: 0, shareCount: 0 };
      }
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

// Batch fetch attachments for posts
const fetchPostAttachments = async (postIds: string[]): Promise<Record<string, PostAttachmentData[]>> => {
  if (postIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('post_attachments')
      .select('id, post_id, file_url, storage_key, file_type, mime_type, width, height, size_bytes, sort_order, alt_text')
      .in('post_id', postIds)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Post attachments fetch error:', error);
      return {};
    }

    const map: Record<string, PostAttachmentData[]> = {};
    (data || []).forEach((row: any) => {
      if (!map[row.post_id]) map[row.post_id] = [];
      map[row.post_id].push(row);
    });
    return map;
  } catch (error) {
    console.error('Error fetching post attachments:', error);
    return {};
  }
};

// Batch-fetch profiles for gift_celebration posts
const fetchGiftProfiles = async (posts: FeedPost[]): Promise<FeedPost[]> => {
  const giftPosts = posts.filter(p => p.post_type === 'gift_celebration');
  if (giftPosts.length === 0) return posts;

  const profileIds = new Set<string>();
  giftPosts.forEach(p => {
    if (p.gift_recipient_id) profileIds.add(p.gift_recipient_id);
    if (p.gift_sender_id && p.gift_sender_id !== p.user_id) profileIds.add(p.gift_sender_id);
  });

  if (profileIds.size === 0) return posts;

  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', Array.from(profileIds));

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return posts.map(post => {
    if (post.post_type !== 'gift_celebration') return post;
    return {
      ...post,
      recipientProfile: post.gift_recipient_id ? (profileMap.get(post.gift_recipient_id) || null) : null,
      senderProfile: (post.gift_sender_id && post.gift_sender_id !== post.user_id)
        ? (profileMap.get(post.gift_sender_id) || null)
        : null,
    };
  });
};

// Fetch friend IDs for a user
const fetchFriendIds = async (userId: string | null): Promise<Set<string>> => {
  if (!userId) return new Set();
  const { data } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  const ids = new Set<string>();
  (data || []).forEach((f: any) => {
    ids.add(f.user_id === userId ? f.friend_id : f.user_id);
  });
  return ids;
};

// Fetch highlighted (pinned) gift celebration posts (today VN time)
const fetchHighlightedPosts = async (): Promise<FeedPost[]> => {
  // Calculate start of today in VN timezone (UTC+7)
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const vnMidnight = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), 0, 0, 0));
  const utcStart = new Date(vnMidnight.getTime() - 7 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('posts')
    .select(`*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, public_wallet_address, is_banned)`)
    .eq('post_type', 'gift_celebration')
    .gte('created_at', utcStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching highlighted posts:', error);
    return [];
  }

  const posts: FeedPost[] = (data || []).map((post: any) => ({
    ...post,
    profiles: post.public_profiles,
    media_urls: (post.media_urls as Array<{ url: string; type: 'image' | 'video' }>) || null,
    visibility: post.visibility || 'public',
  })).filter((post: FeedPost) => !post.profiles?.is_banned);

  return fetchGiftProfiles(posts);
};

const fetchFeedPage = async (cursor: string | null, friendIds: Set<string>): Promise<FeedPage> => {
  let query = supabase
    .from('posts')
    .select(`*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, public_wallet_address, is_banned)`)
    .neq('post_type', 'gift_celebration')
    .order('created_at', { ascending: false })
    .limit(POSTS_PER_PAGE + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: posts, error } = await query;

  if (error) throw error;

  const hasMore = (posts?.length || 0) > POSTS_PER_PAGE;
  const postsToReturn = hasMore ? posts?.slice(0, POSTS_PER_PAGE) : posts;

  let postsData: FeedPost[] = (postsToReturn || []).map((post: any) => ({
    ...post,
    profiles: post.public_profiles,
    media_urls: (post.media_urls as Array<{ url: string; type: 'image' | 'video' }>) || null,
    visibility: post.visibility || 'public',
  })).filter((post: FeedPost) => !post.profiles?.is_banned);

  postsData = await fetchGiftProfiles(postsData);

  // Sort: friends first, then others, keeping chronological order within each group
  if (friendIds.size > 0) {
    postsData.sort((a, b) => {
      const aFriend = friendIds.has(a.user_id) ? 0 : 1;
      const bFriend = friendIds.has(b.user_id) ? 0 : 1;
      if (aFriend !== bFriend) return aFriend - bFriend;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }
  
  const postIds = postsData.map(p => p.id);
  const [postStats, attachmentsMap] = await Promise.all([
    fetchPostStats(postIds),
    fetchPostAttachments(postIds),
  ]);

  postsData = postsData.map(p => ({
    ...p,
    attachments: attachmentsMap[p.id] || [],
  }));

  const nextCursor = hasMore && postsData.length > 0 
    ? postsData[postsData.length - 1].created_at 
    : null;

  return { posts: postsData, postStats, nextCursor };
};

export const useFeedPosts = () => {
  const queryClient = useQueryClient();
  const { userId: currentUserId } = useCurrentUser();

  // Cache friend IDs
  const { data: friendIdsData } = useQuery({
    queryKey: ['friend-ids', currentUserId],
    queryFn: () => fetchFriendIds(currentUserId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!currentUserId,
  });
  const friendIds = useMemo(() => friendIdsData ?? new Set<string>(), [friendIdsData]);

  const query = useInfiniteQuery<FeedPage, Error>({
    queryKey: ['feed-posts', currentUserId],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as string | null, friendIds),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
  }, [queryClient]);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] });
    };
    window.addEventListener('invalidate-feed', handler);
    return () => window.removeEventListener('invalidate-feed', handler);
  }, [queryClient]);

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] });
    }, 30_000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Realtime: instantly refresh gift celebrations on any change
  useEffect(() => {
    const invalidateGifts = () => {
      queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] });
      queryClient.invalidateQueries({ queryKey: ['gift-day-counts'] });
      queryClient.invalidateQueries({ queryKey: ['donation-count-by-date'] });
    };

    const channel = supabase
      .channel('gift-celebration-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: 'post_type=eq.gift_celebration',
        },
        () => invalidateGifts()
      )
      .subscribe((status) => {
        // If channel disconnects then reconnects, refetch to catch missed events
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => invalidateGifts(), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const highlightedQuery = useQuery<{ posts: FeedPost[]; postStats: Record<string, PostStats> }>({
    queryKey: ['highlighted-posts'],
    queryFn: async () => {
      const posts = await fetchHighlightedPosts();
      const postIds = posts.map(p => p.id);
      const postStats = await fetchPostStats(postIds);
      return { posts, postStats };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    placeholderData: (prev) => prev,
  });

  const highlightedPosts = highlightedQuery.data?.posts || [];
  const highlightedStats = highlightedQuery.data?.postStats || {};
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
