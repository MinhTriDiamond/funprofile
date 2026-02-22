import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditProfile } from '@/components/profile/EditProfile';
import { FacebookPostCard } from '@/components/feed/FacebookPostCard';
import { GiftCelebrationCard } from '@/components/feed/GiftCelebrationCard';
import { FacebookCreatePost } from '@/components/feed/FacebookCreatePost';
import { FriendRequestButton } from '@/components/friends/FriendRequestButton';
import { FriendsList } from '@/components/friends/FriendsList';
import { CoverHonorBoard } from '@/components/profile/CoverHonorBoard';
import { AvatarOrbit } from '@/components/profile/AvatarOrbit';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/LazyImage';
import { CoverPhotoEditor } from '@/components/profile/CoverPhotoEditor';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { MoreHorizontal, MapPin, Briefcase, GraduationCap, Heart, Clock, MessageCircle, Eye, X, Pin, PenSquare, Gift, Copy, Wallet, Shield } from 'lucide-react';
import { DonationButton } from '@/components/donations/DonationButton';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PullToRefreshContainer } from '@/components/common/PullToRefreshContainer';
import { useConversations } from '@/hooks/useConversations';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface FriendPreview {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { userId, username } = useParams();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]); // Combined and sorted posts
  const [originalPosts, setOriginalPosts] = useState<any[]>([]); // For photos grid
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsPreview, setFriendsPreview] = useState<FriendPreview[]>([]);
  const [activeTab, setActiveTab] = useState('posts'); // Controlled tabs state
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { createDirectConversation } = useConversations(currentUserId);
  
  const handleStartChat = async () => {
    if (!currentUserId || !profile?.id) return;
    try {
      const result = await createDirectConversation.mutateAsync(profile.id);
      if (result) {
        navigate(`/chat/${result.id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };
  const [viewAsPublic, setViewAsPublic] = useState(false);

  // Determine if we should show private elements (own profile AND not in View As mode)
  const showPrivateElements = isOwnProfile && !viewAsPublic;

  // Reserved paths that should NOT be treated as usernames
  const reservedPaths = ['auth', 'feed', 'friends', 'wallet', 'about', 'leaderboard', 'admin', 'notifications', 'docs', 'post', 'law-of-light', 'profile'];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setCurrentUserId(session.user.id);
        // Check admin role
        supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' })
          .then(({ data }) => setIsAdmin(!!data));
      }
      
      // Check if username route is actually a reserved path
      if (username && reservedPaths.includes(username.toLowerCase())) {
        navigate(`/${username}`);
        return;
      }
      
      // If username is provided, look up by username
      if (username) {
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
        const { data: profileData } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('username', cleanUsername)
          .single();
        
        if (profileData) {
          setIsOwnProfile(session ? profileData.id === session.user.id : false);
          fetchProfile(profileData.id, session?.user.id);
        } else {
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
          // Guest trying to view /profile without userId → redirect to feed
          navigate('/', { replace: true });
          return;
        }
      }
      
      setIsOwnProfile(session ? profileId === session.user.id : false);
      fetchProfile(profileId, session?.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUserId(session.user.id);
        if (userId) {
          setIsOwnProfile(session.user.id === userId);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId('');
        setIsOwnProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, userId, username]);

  const fetchProfile = async (profileId: string, authUserId?: string) => {
    try {
      const isViewingOwnProfile = authUserId ? profileId === authUserId : profileId === currentUserId;
      
      const profileQuery = isViewingOwnProfile
        ? supabase.from('profiles').select('*').eq('id', profileId).single()
        : supabase.from('public_profiles')
            .select('id, username, display_name, avatar_url, full_name, bio, cover_url, created_at, public_wallet_address, social_links')
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

      // Run ALL queries in parallel
      const [profileRes, postsRes, giftSenderRes, sharedRes, friendsRes] = await Promise.all([
        profileQuery, postsQuery, giftSenderQuery, sharedQuery, friendsQuery,
      ]);

      if (profileRes.error) throw profileRes.error;
      const data = profileRes.data;
      setProfile(data);

      if (userId && (data as any)?.username) {
        navigate(`/${(data as any).username}`, { replace: true });
      }

      // Map public_profiles to profiles key for component compatibility
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

      // Batch-fetch recipient/sender profiles for gift_celebration posts (depends on posts results)
      const giftPostsInProfile = allUserPosts.filter(p => p.post_type === 'gift_celebration');
      const profileIdsToFetch = new Set<string>();
      giftPostsInProfile.forEach(p => {
        if (p.gift_recipient_id) profileIdsToFetch.add(p.gift_recipient_id);
        if (p.gift_sender_id && p.gift_sender_id !== p.user_id) profileIdsToFetch.add(p.gift_sender_id);
      });

      // Friends preview query (depends on friends result)
      const friendsData = friendsRes.data;
      const friendIds = (friendsData || []).map(f => f.user_id === profileId ? f.friend_id : f.user_id);

      // Run gift profiles + friend profiles in parallel (2nd wave)
      const [giftProfilesRes, friendProfilesRes] = await Promise.all([
        profileIdsToFetch.size > 0
          ? supabase.from('public_profiles').select('id, username, display_name, avatar_url').in('id', Array.from(profileIdsToFetch))
          : Promise.resolve({ data: [] as any[] }),
        friendIds.length > 0
          ? supabase.from('public_profiles').select('id, username, full_name, avatar_url').in('id', friendIds).limit(6)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Process gift profiles
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

      // Combine and sort posts
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
  };

  // Helper function to scroll to tabs section
  const scrollToTabs = useCallback(() => {
    setTimeout(() => {
      document.getElementById('profile-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  // Navigation helper functions for controlled tabs
  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    scrollToTabs();
  }, [scrollToTabs]);

  const handlePostDeleted = () => {
    const profileId = userId || currentUserId;
    if (profileId) {
      fetchProfile(profileId);
    }
  };

  const handlePullRefresh = useCallback(async () => {
    const profileId = profile?.id || userId || currentUserId;
    if (profileId) {
      await fetchProfile(profileId, currentUserId);
    }
  }, [profile?.id, userId, currentUserId]);

  // Handle pin/unpin post
  const handlePinPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pinned_post_id: postId })
        .eq('id', currentUserId);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, pinned_post_id: postId }));
      toast.success(t('postPinned'));
    } catch (error) {
      toast.error(t('cannotPinPost'));
    }
  };

  const handleUnpinPost = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pinned_post_id: null })
        .eq('id', currentUserId);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, pinned_post_id: null }));
      toast.success(t('postUnpinned'));
    } catch (error) {
      toast.error(t('cannotUnpinPost'));
    }
  };

  // Sort posts with pinned post first
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

  if (loading) {
    return (
      <div className="min-h-screen overflow-hidden">
        <FacebookNavbar />
        <main className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto">
          <Skeleton className="h-[350px] w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen overflow-hidden">
        <FacebookNavbar />
        <main className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-[2cm] text-center py-12">
            <p className="text-muted-foreground">{t('profileNotFound')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <FacebookNavbar />
      
      {/* View As Banner */}
      {viewAsPublic && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 flex items-center justify-center gap-4 shadow-lg">
          <Eye className="w-5 h-5" />
          <span className="font-medium">{t('viewingAsOther')}</span>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => setViewAsPublic(false)}
            className="ml-2"
          >
            <X className="w-4 h-4 mr-1" />
            {t('exitViewMode')}
          </Button>
        </div>
      )}
      
      <main data-app-scroll className={`fixed inset-x-0 bottom-0 overflow-y-auto pb-20 lg:pb-4 ${viewAsPublic ? 'top-[4cm]' : 'top-[3cm]'}`}>
        <PullToRefreshContainer onRefresh={handlePullRefresh}>
          {/* Cover Photo Section - Facebook 2025 Style */}
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-[2cm]">
            <div className="relative">
            {/* Cover Photo Container with rounded corners */}
            <div className="h-[200px] sm:h-[210px] md:h-[280px] relative rounded-2xl mx-2 md:mx-0">
              {/* Cover Image with overflow hidden only on image */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                {profile?.cover_url ? (
                  <LazyImage 
                    src={profile.cover_url} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                    transformPreset="cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/40 via-gold/30 to-primary/40" />
                )}
                
                {/* Gradient overlay at bottom for better text readability */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Honor Board Overlay - inside cover, right side */}
              <div 
                className="absolute z-20 hidden md:block top-3 right-3 lg:top-4 lg:right-4 rounded-2xl p-1.5 bg-white/30 backdrop-blur-sm"
                style={{ width: 'clamp(320px, 34vw, 460px)' }}
              >
                <CoverHonorBoard 
                  userId={profile.id}
                  username={profile?.username}
                  avatarUrl={profile?.avatar_url}
                />
              </div>

              {/* Mobile Honor Board Overlay - smaller, bottom-right */}
              <div className="absolute z-20 md:hidden bottom-16 right-2 sm:right-3 w-[220px] sm:w-[250px] rounded-2xl p-1 bg-white/50 backdrop-blur-sm origin-bottom-right scale-[0.85] sm:scale-90">
                <CoverHonorBoard 
                  userId={profile.id}
                  username={profile?.username}
                  avatarUrl={profile?.avatar_url}
                />
              </div>

              {/* Edit Cover Button - bottom left on md+, bottom right on mobile */}
              {showPrivateElements && (
                <div className="absolute bottom-3 right-3 md:right-auto md:left-[8cm] sm:bottom-4 sm:right-4 z-[100] isolate">
                  <CoverPhotoEditor 
                    userId={currentUserId}
                    currentCoverUrl={profile?.cover_url}
                    onCoverUpdated={(newUrl) => setProfile({ ...profile, cover_url: newUrl })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Profile Info Section - Facebook 2025 Layout */}
          <div className="bg-card/80 border-b border-border shadow-sm md:rounded-b-xl">
            <div className="px-4 md:px-8 py-4 md:py-6">
              {/* Avatar + Info Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Avatar - positioned higher to overlap cover */}
                <div className="-mt-[120px] sm:-mt-[130px] md:-mt-[217px] relative z-10 flex justify-center md:justify-start flex-shrink-0" style={{ overflow: 'visible' }}>
                  <AvatarOrbit
                    key={profile?.id}
                    socialLinks={Array.isArray(profile?.social_links) ? profile.social_links : []}
                    isOwner={isOwnProfile}
                    userId={profile?.id}
                    onLinksChanged={(links) => setProfile({ ...profile, social_links: links })}
                  >
                    {showPrivateElements ? (
                      <AvatarEditor
                        userId={currentUserId}
                        currentAvatarUrl={profile?.avatar_url}
                        username={profile?.username}
                        onAvatarUpdated={(newUrl) => setProfile({ ...profile, avatar_url: newUrl })}
                        size="large"
                      />
                    ) : (
                      <div 
                        className="rounded-full p-1"
                        style={{
                          background: 'linear-gradient(135deg, #166534 0%, #22c55e 50%, #16a34a 100%)'
                        }}
                      >
                        <Avatar 
                          className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 border-4 border-white"
                        >
                          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} sizeHint="lg" />}
                          <AvatarFallback className="text-3xl md:text-4xl bg-primary text-primary-foreground">
                            {profile?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </AvatarOrbit>
                </div>

                {/* Name, Friends, Bio, Info - Facebook style inline */}
                <div className="flex-1 text-center md:text-left md:ml-4">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                    {profile?.display_name || profile?.username}
                  </h1>
                   {/* Username handle and profile link */}
                   <div className="flex items-center gap-1.5 text-sm font-bold text-green-600 mt-0.5">
                     <span>@{profile?.username}</span>
                     <span className="text-muted-foreground font-normal">·</span>
                     <a href={`https://fun.rich/${profile?.username}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors cursor-pointer">fun.rich/{profile?.username}</a>
                     <button
                       type="button"
                       onClick={() => {
                         navigator.clipboard.writeText(`https://fun.rich/${profile?.username}`);
                         toast.success('Đã sao chép link hồ sơ!');
                       }}
                       className="p-0.5 rounded hover:bg-muted text-primary"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                     </button>
                   </div>

                  {/* Public Wallet Address - fallback: public > external > custodial */}
                  {(() => {
                    const displayAddress = profile?.public_wallet_address || profile?.external_wallet_address || profile?.custodial_wallet_address;
                    if (displayAddress) {
                      return (
                        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                          <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground font-mono font-medium">
                            {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(displayAddress);
                              toast.success(t('walletCopied'));
                            }}
                            className="p-1 rounded hover:bg-primary/10 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-primary hover:text-primary/80" />
                          </button>
                        </div>
                      );
                    }
                    if (showPrivateElements) {
                      return (
                        <button
                          onClick={() => navigateToTab('edit')}
                          className="flex items-center gap-2 mt-1 text-sm text-primary hover:underline"
                        >
                          <Wallet className="w-4 h-4" />
                          {t('addPublicWallet')}
                        </button>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Wallet className="w-4 h-4" />
                        <span>{t('notUpdated')}</span>
                      </div>
                    );
                  })()}
                  
                  {/* Bio text - full display with wrap */}
                  {profile?.bio && (
                    <p className="text-xs sm:text-sm text-green-700 mt-1 whitespace-pre-wrap break-words max-w-md">
                      {profile.bio}
                    </p>
                  )}
                  
                  {/* Info badges - all in one horizontal row */}
                  <div className="flex flex-nowrap items-center justify-center md:justify-start gap-x-4 mt-2 text-sm sm:text-base text-green-600 font-medium">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <MapPin className="w-5 h-5 flex-shrink-0" />
                      <span>Việt Nam</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Briefcase className="w-5 h-5 flex-shrink-0" />
                      <span>FUN Ecosystem</span>
                    </div>
                  </div>
                  
                  {/* Friend Avatars Stack - Real friend photos */}
                  {friendsPreview.length > 0 && (
                    <div className="hidden md:flex -space-x-2 mt-3">
                      {friendsPreview.slice(0, 6).map((friend) => (
                        <Avatar 
                          key={friend.id} 
                          className="w-8 h-8 border-2 border-card cursor-pointer hover:z-10 hover:scale-110 transition-transform"
                          onClick={() => navigate(`/@${friend.username}`)}
                        >
                          <AvatarImage src={friend.avatar_url || undefined} sizeHint="sm" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-gold/30 text-foreground text-xs font-bold">
                            {(friend.full_name || friend.username)?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                </div>

                {/* Honor Board now rendered inside cover photo overlay */}

                {/* Action Buttons - visible on ALL breakpoints */}
                {!viewAsPublic && (
                  <div className="flex flex-wrap justify-center md:justify-end gap-2 pb-2">
                    {isOwnProfile ? (
                      <>
                        <Button 
                          variant="secondary" 
                          className="font-semibold px-4 h-10"
                          onClick={() => navigateToTab('edit')}
                        >
                          <PenSquare className="w-4 h-4 mr-2" />
                          {t('editPersonalPage')}
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline"
                            className="font-semibold px-4 h-10 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => navigate('/admin')}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <FriendRequestButton userId={profile.id} currentUserId={currentUserId} />
                        <Button 
                          variant="secondary" 
                          className="font-semibold px-4 h-10"
                          onClick={handleStartChat}
                          disabled={createDirectConversation.isPending}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {t('sendMessage')}
                        </Button>
                        <DonationButton
                          recipientId={profile.id}
                          recipientUsername={profile.username}
                          recipientDisplayName={profile.display_name}
                          recipientWalletAddress={profile.public_wallet_address || profile.external_wallet_address || profile.wallet_address || profile.custodial_wallet_address}
                          recipientAvatarUrl={profile.avatar_url}
                          variant="profile"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border px-4 md:px-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" id="profile-tabs">
                <TabsList className="h-auto bg-transparent p-0 border-0 justify-start gap-1 flex overflow-x-auto scrollbar-hide -mb-px">
                  <TabsTrigger 
                    value="posts" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    {t('allPosts')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    {t('about')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    {t('friends')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="photos" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    {t('photos')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="videos" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                  >
                    {t('reels')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="honorboard" 
                    className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors md:hidden"
                  >
                    {t('honorBoard')}
                  </TabsTrigger>
                  {showPrivateElements && (
                    <TabsTrigger 
                      value="edit" 
                      className="px-4 py-4 rounded-t-lg border-b-[3px] border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:bg-muted/50 font-semibold text-base whitespace-nowrap transition-colors"
                    >
                      {t('editProfile')}
                    </TabsTrigger>
                  )}
                  <div className="flex-1" />
                  <Button variant="secondary" size="icon" className="h-10 w-10 my-2 mr-2 flex-shrink-0">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </TabsList>

                <div className="py-4 px-4 md:px-8">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Left Sidebar - Intro */}
                    <div className="lg:col-span-2 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {/* Intro Card - Facebook style */}
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-foreground">{t('personalInfo')}</h3>
                            {showPrivateElements && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => navigateToTab('edit')}
                              >
                                <PenSquare className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {(profile?.location || showPrivateElements) && (
                              <div className="flex items-center gap-3 text-foreground">
                                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <span>{t('livesIn')} <strong>{profile?.location || (showPrivateElements ? '—' : '')}</strong></span>
                              </div>
                            )}
                            {(profile?.workplace || showPrivateElements) && (
                              <div className="flex items-center gap-3 text-foreground">
                                <Briefcase className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <span>{t('worksAt')} <strong>{profile?.workplace || (showPrivateElements ? '—' : '')}</strong></span>
                              </div>
                            )}
                            {(profile?.education || showPrivateElements) && (
                              <div className="flex items-center gap-3 text-foreground">
                                <GraduationCap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <span>{t('studiesAt')} <strong>{profile?.education || (showPrivateElements ? '—' : '')}</strong></span>
                              </div>
                            )}
                            {(profile?.relationship_status || showPrivateElements) && (
                              <div className="flex items-center gap-3 text-foreground">
                                <Heart className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <span>{profile?.relationship_status || (showPrivateElements ? '—' : t('single'))}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-foreground">
                              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <span>{t('joinedSince')} {new Date(profile?.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}</span>
                            </div>
                          </div>
                          
                          {showPrivateElements && (
                            <Button 
                              variant="secondary" 
                              className="w-full mt-4"
                              onClick={() => navigateToTab('edit')}
                            >
                              {t('editDetails')}
                            </Button>
                          )}
                        </div>

                        {/* Photos Card - Facebook style */}
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-foreground">{t('photos')}</h3>
                            <button 
                              className="text-primary hover:underline text-sm font-medium"
                              onClick={() => navigateToTab('photos')}
                            >
                              {t('viewAllPhotos')}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                            {originalPosts.filter(p => p.image_url).slice(0, 9).map((post, i) => (
                              <LazyImage 
                                key={i}
                                src={post.image_url}
                                alt=""
                                className="w-full aspect-square cursor-pointer"
                                onClick={() => navigateToTab('photos')}
                              />
                            ))}
                            {originalPosts.filter(p => p.image_url).length === 0 && (
                              <div className="col-span-3 py-8 text-center text-muted-foreground text-sm">
                                {t('noPhotosYet')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Friends Card - Facebook style with real data */}
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="font-bold text-lg text-foreground">{t('friends')}</h3>
                              <p className="text-sm text-muted-foreground">{friendsCount} {t('friendsSuffix')}</p>
                            </div>
                            <button 
                              className="text-primary hover:underline text-sm font-medium"
                              onClick={() => navigateToTab('friends')}
                            >
                              {t('viewAllFriends')}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {friendsPreview.length > 0 ? (
                              friendsPreview.map((friend) => (
                                <div 
                                  key={friend.id} 
                                  className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => navigate(`/@${friend.username}`)}
                                >
                                  <Avatar className="w-full aspect-square rounded-lg mb-1 border-2 border-border overflow-hidden">
                                    <AvatarImage 
                                      src={friend.avatar_url || undefined} 
                                      sizeHint="md"
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="rounded-lg text-lg bg-gradient-to-br from-primary/20 to-gold/20 text-foreground">
                                      {(friend.full_name || friend.username)?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="text-xs text-foreground truncate font-medium">
                                    {friend.full_name || friend.username}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-3 py-8 text-center text-muted-foreground text-sm">
                                {t('noFriendsYet')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </div>

                    {/* Right Content - Posts */}
                    <div className="lg:col-span-3 space-y-4">
                      <TabsContent value="posts" className="mt-0 space-y-4">
                        {/* Create Post - Facebook style */}
                        {showPrivateElements && currentUserId && (
                          <FacebookCreatePost 
                            onPostCreated={() => {
                              const profileId = userId || currentUserId;
                              if (profileId) {
                                fetchProfile(profileId);
                              }
                            }}
                          />
                        )}
                        
                        {sortedPosts.length === 0 ? (
                          <div className="bg-card/70 rounded-xl shadow-sm border border-border p-8 text-center text-muted-foreground">
                            {t('noPostsYet')}
                          </div>
                        ) : (
                          sortedPosts.map((item) => {
                            const isPinned = item._type === 'original' && item.id === profile?.pinned_post_id;
                            
                            return item._type === 'shared' ? (
                              <div key={`shared-${item.id}`} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                                  <span className="font-semibold text-primary">{t('sharedLabel')}</span>
                                </div>
                                <FacebookPostCard 
                                  post={item.posts} 
                                  currentUserId={currentUserId}
                                  onPostDeleted={handlePostDeleted}
                                />
                              </div>
                            ) : (
                              <div key={item.id} className="space-y-0">
                                {/* Pinned Post Badge */}
                                {isPinned && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-secondary/50 rounded-t-xl border-b border-border">
                                    <Pin className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{t('pinnedPost')}</span>
                                  </div>
                                )}
                                {item.post_type === 'gift_celebration' ? (
                                  <GiftCelebrationCard
                                    post={item}
                                    currentUserId={currentUserId}
                                    onPostDeleted={handlePostDeleted}
                                  />
                                ) : (
                                  <FacebookPostCard 
                                    post={item} 
                                    currentUserId={currentUserId}
                                    onPostDeleted={handlePostDeleted}
                                    isPinned={isPinned}
                                    onPinPost={showPrivateElements ? handlePinPost : undefined}
                                    onUnpinPost={showPrivateElements ? handleUnpinPost : undefined}
                                    isOwnProfile={isOwnProfile}
                                    viewAsPublic={viewAsPublic}
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="about" className="mt-0">
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">{t('about')}</h3>
                          <div className="space-y-4">
                            {/* Public Wallet Address in About */}
                            <div className="flex items-center gap-3 text-foreground">
                              <Wallet className="w-6 h-6 text-muted-foreground" />
                              {profile?.public_wallet_address ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">
                                    {profile.public_wallet_address.slice(0, 6)}...{profile.public_wallet_address.slice(-4)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(profile.public_wallet_address);
                                      toast.success(t('walletCopied'));
                                    }}
                                    className="p-1 rounded hover:bg-muted transition-colors"
                                  >
                                    <Copy className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                  {showPrivateElements && (
                                    <button
                                      onClick={() => navigateToTab('edit')}
                                      className="text-xs text-primary hover:underline ml-1"
                                    >
                                      {t('edit')}
                                    </button>
                                  )}
                                </div>
                              ) : showPrivateElements ? (
                                <button
                                  onClick={() => navigateToTab('edit')}
                                  className="text-primary hover:underline text-sm"
                                >
                                  {t('addPublicWallet')}
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('notUpdated')}</span>
                              )}
                            </div>
                            {profile?.workplace && (
                              <div className="flex items-center gap-3 text-foreground">
                                <Briefcase className="w-6 h-6 text-muted-foreground" />
                                <span>{t('worksAt')} <strong>{profile.workplace}</strong></span>
                              </div>
                            )}
                            {profile?.education && (
                              <div className="flex items-center gap-3 text-foreground">
                                <GraduationCap className="w-6 h-6 text-muted-foreground" />
                                <span>{t('studiesAt')} <strong>{profile.education}</strong></span>
                              </div>
                            )}
                            {profile?.location && (
                              <div className="flex items-center gap-3 text-foreground">
                                <MapPin className="w-6 h-6 text-muted-foreground" />
                                <span>{t('livesIn')} <strong>{profile.location}</strong></span>
                              </div>
                            )}
                            {profile?.relationship_status && (
                              <div className="flex items-center gap-3 text-foreground">
                                <Heart className="w-6 h-6 text-muted-foreground" />
                                <span>{profile.relationship_status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="friends" className="mt-0">
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">{t('friends')}</h3>
                          <FriendsList userId={profile.id} />
                        </div>
                      </TabsContent>

                      <TabsContent value="photos" className="mt-0">
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">{t('photos')}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {originalPosts.filter(p => p.image_url).map((post, i) => (
                              <img 
                                key={i}
                                src={post.image_url}
                                alt=""
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ))}
                          </div>
                          {originalPosts.filter(p => p.image_url).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">{t('noPhotosYet')}</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="videos" className="mt-0">
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                          <h3 className="font-bold text-xl mb-4 text-foreground">{t('reels')}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {originalPosts.filter(p => p.video_url).map((post, i) => (
                              <video 
                                key={i}
                                src={post.video_url}
                                className="w-full aspect-video object-cover rounded-lg"
                                controls
                              />
                            ))}
                          </div>
                          {originalPosts.filter(p => p.video_url).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">{t('noReelsYet')}</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="honorboard" className="mt-0 md:hidden">
                        <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                          <CoverHonorBoard 
                            userId={profile.id}
                            username={profile?.username}
                            avatarUrl={profile?.avatar_url}
                          />
                        </div>
                      </TabsContent>

                      {showPrivateElements && (
                        <TabsContent value="edit" className="mt-0">
                          <div className="bg-card/70 rounded-xl shadow-sm border border-border p-6">
                            <EditProfile />
                          </div>
                        </TabsContent>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
        </PullToRefreshContainer>
      </main>
      
      {/* Mobile Bottom Navigation with Honor Board */}
      <MobileBottomNav />
    </div>
  );
};

export default Profile;
