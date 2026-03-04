import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { PostStats } from '@/hooks/useFeedPosts';
import type { ProfilePostItem, OriginalProfilePost, SharedProfilePost, BasePostFields, ProfilePostProfile, ProfilePostReaction, ProfilePostComment } from '@/types/profilePosts';

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
  social_links?: Array<{ platform: string; label: string; url: string; color: string; favicon: string; avatarUrl?: string }>;
  is_banned?: boolean;
  location?: string | null;
  workplace?: string | null;
  education?: string | null;
  relationship_status?: string | null;
  pinned_post_id?: string | null;
  fun_id?: string | null;
  admin_notes?: string | null;
  reward_status?: string | null;
  pending_reward?: number;
  approved_reward?: number;
  grand_total_deposit?: number;
  grand_total_withdraw?: number;
  grand_total_bet?: number;
  grand_total_win?: number;
  grand_total_loss?: number;
  grand_total_profit?: number;
  financial_updated_at?: string | null;
}

const POSTS_PER_PAGE = 10;

const reservedPaths = ['auth', 'feed', 'friends', 'wallet', 'about', 'leaderboard', 'admin', 'notifications', 'docs', 'post', 'law-of-light', 'profile'];

export const useProfile = () => {
  const navigate = useNavigate();
  const { userId, username } = useParams();
  const { userId: authUserId } = useCurrentUser();
  const currentUserId = authUserId || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [allPosts, setAllPosts] = useState<ProfilePostItem[]>([]);
  const [originalPosts, setOriginalPosts] = useState<OriginalProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
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

      const mapProfiles = <T extends { public_profiles?: ProfilePostProfile; profiles?: ProfilePostProfile }>(posts: T[]): (T & { profiles: ProfilePostProfile })[] =>
        (posts || []).map((p) => ({
          ...p,
          profiles: (p.public_profiles || p.profiles || { username: 'unknown', avatar_url: null }) as ProfilePostProfile,
        }));

      const postsData = postsRes.data || [];
      const giftSenderPosts = giftSenderRes.data || [];

      const existingPostIds = new Set(postsData.map((p) => p.id));
      const allUserPosts = [
        ...mapProfiles(postsData),
        ...mapProfiles(giftSenderPosts).filter((p) => !existingPostIds.has(p.id))
      ];
      setOriginalPosts(allUserPosts as unknown as OriginalProfilePost[]);

      // Batch-fetch gift profiles
      const giftPostsInProfile = allUserPosts.filter(p => p.post_type === 'gift_celebration');
      const profileIdsToFetch = new Set<string>();
      giftPostsInProfile.forEach(p => {
        if (p.gift_recipient_id) profileIdsToFetch.add(p.gift_recipient_id);
        if (p.gift_sender_id && p.gift_sender_id !== p.user_id) profileIdsToFetch.add(p.gift_sender_id);
      });

      const friendsData = friendsRes.data;
      const friendIds = (friendsData || []).map(f => f.user_id === profileId ? f.friend_id : f.user_id);

      type GiftProfile = { id: string; username: string; display_name?: string | null; avatar_url: string | null };
      const emptyResult = { data: [] as GiftProfile[] };

      const [giftProfilesRes, friendProfilesRes] = await Promise.all([
        profileIdsToFetch.size > 0
          ? supabase.from('public_profiles').select('id, username, display_name, avatar_url').in('id', Array.from(profileIdsToFetch))
          : Promise.resolve(emptyResult),
        friendIds.length > 0
          ? supabase.from('public_profiles').select('id, username, full_name, avatar_url').in('id', friendIds).limit(6)
          : Promise.resolve({ data: [] as FriendPreview[] }),
      ]);

      const giftProfileMap = new Map<string, { username: string; display_name?: string | null; avatar_url: string | null }>();
      (giftProfilesRes.data || []).forEach((p) => giftProfileMap.set(p.id, p));

      const allUserPostsWithGiftProfiles: OriginalProfilePost[] = allUserPosts.map(post => {
        const base = {
          ...post,
          _type: 'original' as const,
          _sortTime: new Date(post.created_at).getTime(),
        } as OriginalProfilePost;
        if (post.post_type !== 'gift_celebration') return base;
        return {
          ...base,
          recipientProfile: post.gift_recipient_id ? (giftProfileMap.get(post.gift_recipient_id) || null) : null,
          senderProfile: (post.gift_sender_id && post.gift_sender_id !== post.user_id)
            ? (giftProfileMap.get(post.gift_sender_id) || null) : null,
        };
      });

      setOriginalPosts(allUserPostsWithGiftProfiles);

      const combinedPosts: ProfilePostItem[] = [...allUserPostsWithGiftProfiles];
      const sharedPostsData = sharedRes.data;
      (sharedPostsData || []).forEach((sharedPost) => {
        if (sharedPost.posts) {
          const raw = sharedPost.posts as unknown as { public_profiles?: ProfilePostProfile; profiles?: ProfilePostProfile };
          const mappedPost = { ...(sharedPost.posts as object), profiles: raw.public_profiles || raw.profiles || { username: 'unknown', avatar_url: null } } as BasePostFields;
          combinedPosts.push({
            ...sharedPost,
            posts: mappedPost,
            _type: 'shared',
            _sortTime: new Date(sharedPost.created_at).getTime(),
          } as unknown as SharedProfilePost);
        }
      });
      combinedPosts.sort((a, b) => b._sortTime - a._sortTime);
      setAllPosts(combinedPosts);

      setFriendsCount(friendsRes.count || 0);
      setFriendsPreview((friendProfilesRes.data || []) as FriendPreview[]);
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

    // Check admin role when auth user available
    if (currentUserId) {
      supabase.rpc('has_role', { _user_id: currentUserId, _role: 'admin' })
        .then(({ data }) => setIsAdmin(!!data));
    }

    if (username && reservedPaths.includes(username.toLowerCase())) {
      navigate(`/${username}`);
      return;
    }
    
    if (username) {
      const cleanUsername = decodeURIComponent(username.startsWith('@') ? username.slice(1) : username).trim();
      supabase
        .from('public_profiles')
        .select('id')
        .eq('username_normalized', cleanUsername.toLowerCase())
        .single()
        .then(({ data: profileData }) => {
          if (profileData) {
            setIsOwnProfile(currentUserId ? profileData.id === currentUserId : false);
            fetchProfile(profileData.id, currentUserId || undefined);
          } else {
            supabase
              .from('username_history')
              .select('new_username')
              .eq('old_username', cleanUsername)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data: history }) => {
                if (history?.new_username) {
                  navigate(`/${history.new_username}`, { replace: true });
                } else {
                  setLoading(false);
                  setProfile(null);
                }
              });
          }
        });
      return;
    }
    
    let profileId = userId;
    if (!userId) {
      if (currentUserId) {
        profileId = currentUserId;
      } else {
        navigate('/', { replace: true });
        return;
      }
    }
    
    setIsOwnProfile(currentUserId ? profileId === currentUserId : false);
    fetchProfile(profileId!, currentUserId || undefined);
  }, [navigate, userId, username, fetchProfile, currentUserId]);

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

  const buildInitialStats = useCallback((post: ProfilePostItem): PostStats | undefined => {
    if (post._type === 'shared') return undefined;
    const orig = post as OriginalProfilePost;
    if (!orig.reactions && !orig.comments) return undefined;
    return {
      reactions: (orig.reactions || []).map((r) => ({ id: r.id, user_id: r.user_id, type: r.type })),
      commentCount: (orig.comments || []).length,
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
