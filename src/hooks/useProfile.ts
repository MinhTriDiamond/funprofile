import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { PostStats } from '@/hooks/useFeedPosts';

export interface FriendPreview {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProfileData {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  bio?: string | null;
  cover_url?: string | null;
  created_at: string;
  public_wallet_address?: string | null;
  external_wallet_address?: string | null;
  custodial_wallet_address?: string | null;
  wallet_address?: string | null;
  social_links?: any[];
  is_banned?: boolean;
  location?: string | null;
  workplace?: string | null;
  education?: string | null;
  relationship_status?: string | null;
  pinned_post_id?: string | null;
  [key: string]: any;
}

const POSTS_PER_PAGE = 10;

const reservedPaths = ['auth', 'feed', 'friends', 'wallet', 'about', 'leaderboard', 'admin', 'notifications', 'docs', 'post', 'law-of-light', 'profile'];

export const useProfile = () => {
  const navigate = useNavigate();
  const { userId, username } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [originalPosts, setOriginalPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsPreview, setFriendsPreview] = useState<FriendPreview[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_PAGE);
  const [viewAsPublic, setViewAsPublic] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  const showPrivateElements = isOwnProfile && !viewAsPublic;

  const fetchProfile = useCallback(async (profileId: string, authUserId?: string) => {
    try {
      const isViewingOwnProfile = authUserId ? profileId === authUserId : profileId === currentUserId;
      
      const profileQuery = isViewingOwnProfile
        ? supabase.from('profiles').select('*').eq('id', profileId).single()
        : supabase.from('public_profiles')
            .select('id, username, display_name, avatar_url, full_name, bio, cover_url, created_at, public_wallet_address, social_links, is_banned, location, workplace, education, relationship_status')
            .eq('id', profileId).single();

      const postsQuery = supabase
        .from('posts')
        .select(`*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address), reactions (id, user_id, type), comments (id)`)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      const giftSenderQuery = supabase
        .from('posts')
        .select(`*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address), reactions (id, user_id, type), comments (id)`)
        .eq('gift_sender_id', profileId)
        .eq('post_type', 'gift_celebration')
        .neq('user_id', profileId)
        .order('created_at', { ascending: false });

      const sharedQuery = supabase
        .from('shared_posts')
        .select(`*, posts:original_post_id (*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, full_name, public_wallet_address), reactions (id, user_id, type), comments (id))`)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      const friendsQuery = supabase
        .from('friendships')
        .select('user_id, friend_id', { count: 'exact' })
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
        .eq('status', 'accepted')
        .limit(6);

      const [profileRes, postsRes, giftSenderRes, sharedRes, friendsRes] = await Promise.all([
        profileQuery, postsQuery, giftSenderQuery, sharedQuery, friendsQuery,
      ]);

      if (profileRes.error) throw profileRes.error;
      const data = profileRes.data as ProfileData;
      setProfile(data);

      if (userId && data?.username) {
        navigate(`/${encodeURIComponent((data.username || '').trim())}`, { replace: true });
      }

      const mapProfiles = (posts: any[]) => (posts || []).map((p: any) => ({
        ...p,
        profiles: p.public_profiles || p.profiles,
      }));

      const postsData = postsRes.data;
      const giftSenderPosts = giftSenderRes.data;

      const existingPostIds = new Set((postsData || []).map((p: any) => p.id));
      const allUserPosts = [
        ...mapProfiles(postsData || []),
        ...mapProfiles(giftSenderPosts || []).filter((p: any) => !existingPostIds.has(p.id))
      ];

      setOriginalPosts(allUserPosts);

      // Batch-fetch gift profiles
      const giftPostsInProfile = allUserPosts.filter(p => p.post_type === 'gift_celebration');
      const profileIdsToFetch = new Set<string>();
      giftPostsInProfile.forEach(p => {
        if (p.gift_recipient_id) profileIdsToFetch.add(p.gift_recipient_id);
        if (p.gift_sender_id && p.gift_sender_id !== p.user_id) profileIdsToFetch.add(p.gift_sender_id);
      });

      const friendsData = friendsRes.data;
      const friendIds = (friendsData || []).map(f => f.user_id === profileId ? f.friend_id : f.user_id);

      const [giftProfilesRes, friendProfilesRes] = await Promise.all([
        profileIdsToFetch.size > 0
          ? supabase.from('public_profiles').select('id, username, display_name, avatar_url').in('id', Array.from(profileIdsToFetch))
          : Promise.resolve({ data: [] as any[] }),
        friendIds.length > 0
          ? supabase.from('public_profiles').select('id, username, full_name, avatar_url').in('id', friendIds).limit(6)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const giftProfileMap = new Map<string, { username: string; display_name?: string | null; avatar_url: string | null }>();
      ((giftProfilesRes as any).data || []).forEach((p: any) => giftProfileMap.set(p.id, p));

      const allUserPostsWithGiftProfiles = allUserPosts.map(post => {
        if (post.post_type !== 'gift_celebration') return post;
        return {
          ...post,
          recipientProfile: post.gift_recipient_id ? (giftProfileMap.get(post.gift_recipient_id) || null) : null,
          senderProfile: (post.gift_sender_id && post.gift_sender_id !== post.user_id)
            ? (giftProfileMap.get(post.gift_sender_id) || null) : null,
        };
      });

      const combinedPosts: any[] = [];
      allUserPostsWithGiftProfiles.forEach(post => {
        combinedPosts.push({ ...post, _type: 'original', _sortTime: new Date(post.created_at).getTime() });
      });
      const sharedPostsData = sharedRes.data;
      (sharedPostsData || []).forEach((sharedPost: any) => {
        if (sharedPost.posts) {
          const mappedPost = { ...sharedPost.posts, profiles: sharedPost.posts.public_profiles || sharedPost.posts.profiles };
          combinedPosts.push({ ...sharedPost, posts: mappedPost, _type: 'shared', _sortTime: new Date(sharedPost.created_at).getTime() });
        }
      });
      combinedPosts.sort((a, b) => b._sortTime - a._sortTime);
      setAllPosts(combinedPosts);

      setFriendsCount(friendsRes.count || 0);
      setFriendsPreview((friendProfilesRes as any).data || []);
    } catch (error) {
      // Error fetching profile - silent fail
    } finally {
      setLoading(false);
    }
  }, [currentUserId, navigate, userId]);

  useEffect(() => {
    setIsOwnProfile(false);
    setProfile(null);
    setLoading(true);

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setCurrentUserId(session.user.id);
        supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' })
          .then(({ data }) => setIsAdmin(!!data));
      }
      
      if (username && reservedPaths.includes(username.toLowerCase())) {
        navigate(`/${username}`);
        return;
      }
      
      if (username) {
        const cleanUsername = decodeURIComponent(username.startsWith('@') ? username.slice(1) : username).trim();
        const { data: profileData } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('username_normalized', cleanUsername.toLowerCase())
          .single();
        
        if (profileData) {
          setIsOwnProfile(session ? profileData.id === session.user.id : false);
          fetchProfile(profileData.id, session?.user.id);
        } else {
          const { data: history } = await supabase
            .from('username_history')
            .select('new_username')
            .eq('old_username', cleanUsername)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (history?.new_username) {
            navigate(`/${history.new_username}`, { replace: true });
            return;
          }
          
          setLoading(false);
          setProfile(null);
        }
        return;
      }
      
      let profileId = userId;
      if (!userId) {
        if (session) {
          profileId = session.user.id;
        } else {
          navigate('/', { replace: true });
          return;
        }
      }
      
      setIsOwnProfile(session ? profileId === session.user.id : false);
      fetchProfile(profileId!, session?.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setCurrentUserId(session?.user?.id ?? '');
        if (userId) {
          setIsOwnProfile(session?.user?.id === userId);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId('');
        setIsOwnProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, userId, username, fetchProfile]);

  const scrollToTabs = useCallback(() => {
    setTimeout(() => {
      document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    scrollToTabs();
  }, [scrollToTabs]);

  const sortedPosts = useMemo(() => {
    if (!profile?.pinned_post_id) return allPosts;
    const pinnedPost = allPosts.find(
      (item) => item._type === 'original' && item.id === profile.pinned_post_id
    );
    if (!pinnedPost) return allPosts;
    const otherPosts = allPosts.filter(
      (item) => !(item._type === 'original' && item.id === profile.pinned_post_id)
    );
    return [pinnedPost, ...otherPosts];
  }, [allPosts, profile?.pinned_post_id]);

  const displayedPosts = useMemo(() => sortedPosts.slice(0, displayedCount), [sortedPosts, displayedCount]);
  const hasMorePosts = displayedCount < sortedPosts.length;

  const buildInitialStats = useCallback((post: any): PostStats | undefined => {
    if (!post.reactions && !post.comments) return undefined;
    return {
      reactions: (post.reactions || []).map((r: any) => ({ id: r.id, user_id: r.user_id, type: r.type })),
      commentCount: (post.comments || []).length,
      shareCount: 0,
    };
  }, []);

  useEffect(() => {
    setDisplayedCount(POSTS_PER_PAGE);
  }, [profile?.id]);

  const handleRefresh = useCallback(async () => {
    const profileId = profile?.id || userId || currentUserId;
    if (profileId) {
      await fetchProfile(profileId, currentUserId);
    }
  }, [profile?.id, userId, currentUserId, fetchProfile]);

  return {
    profile,
    setProfile,
    loading,
    currentUserId,
    isOwnProfile,
    friendsCount,
    friendsPreview,
    activeTab,
    setActiveTab,
    isAdmin,
    displayedCount,
    setDisplayedCount,
    viewAsPublic,
    setViewAsPublic,
    showAvatarViewer,
    setShowAvatarViewer,
    showPrivateElements,
    originalPosts,
    sortedPosts,
    displayedPosts,
    hasMorePosts,
    buildInitialStats,
    navigateToTab,
    fetchProfile,
    handleRefresh,
    POSTS_PER_PAGE,
  };
};
