import { Search, X, ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { SearchHistoryItem } from '@/lib/searchHistory';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export const InlineSearch = () => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { history, addItem, removeItem, clearAll, filteredHistory } = useSearchHistory();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) inputRef.current.focus();
  }, [isExpanded]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length < 2) {
        setProfiles([]);
        setPosts([]);
        return;
      }

      setLoading(true);
      try {
        const sanitize = (s: string) => s.replace(/[%_\\]/g, '\\$&');
        const safe = sanitize(debouncedQuery);

        // Log search async
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            supabase.from('search_logs').insert({ user_id: session.user.id, search_query: debouncedQuery }).then();
          }
        });

        // Save to history
        addItem(debouncedQuery, 'text');

        const [{ data: profileData }, { data: postData }] = await Promise.all([
          supabase
            .from('public_profiles')
            .select('id, username, full_name, avatar_url')
            .or(`username_normalized.ilike.%${safe.toLowerCase()}%,full_name.ilike.%${safe}%`)
            .limit(15),
          supabase
            .from('posts')
            .select(`id, slug, content, created_at, public_profiles!posts_user_id_fkey (username, avatar_url)`)
            .ilike('content', `%${safe}%`)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setProfiles(profileData || []);
        setPosts(((postData as any) || []).map((p: any) => ({ ...p, profiles: p.public_profiles || p.profiles })));
      } catch {
        setProfiles([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    performSearch();
  }, [debouncedQuery]);

  const handleProfileClick = (profile: Profile) => {
    setIsExpanded(false);
    setSearchQuery('');
    addItem('@' + profile.username, 'user', { userId: profile.id, username: profile.username, avatarUrl: profile.avatar_url });
    navigate(`/profile/${profile.id}`);
  };

  const handlePostClick = (post: any) => {
    setIsExpanded(false);
    setSearchQuery('');
    const username = post.profiles?.username;
    const slug = post.slug;
    if (username && slug) navigate(`/${username}/post/${slug}`);
    else navigate(`/post/${post.id}`);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setSearchQuery('');
    setProfiles([]);
    setPosts([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    if (item.type === 'user' && item.metadata?.userId) {
      setIsExpanded(false);
      setSearchQuery('');
      navigate(`/profile/${item.metadata.userId}`);
    } else {
      setSearchQuery(item.query);
    }
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeItem(id);
  };

  // Computed
  const recentFiltered = useMemo(
    () => (searchQuery.trim().length >= 1 ? filteredHistory(searchQuery, 5) : []),
    [searchQuery, filteredHistory, history]
  );

  const showHistory = isExpanded && searchQuery.trim() === '' && history.length > 0;
  const showFilteredHistory = isExpanded && searchQuery.trim().length >= 1 && recentFiltered.length > 0;
  const showResults = isExpanded && searchQuery.trim().length >= 2;
  const hasResults = profiles.length > 0 || posts.length > 0;
  const showDropdown = showHistory || showFilteredHistory || showResults;

  // Highlight matching prefix
  const HighlightText = ({ text, prefix }: { text: string; prefix: string }) => {
    if (!prefix) return <>{text}</>;
    const lower = text.toLowerCase();
    const pLower = prefix.toLowerCase();
    if (!lower.startsWith(pLower)) return <>{text}</>;
    return (
      <>
        <span className="font-bold text-primary">{text.slice(0, prefix.length)}</span>
        {text.slice(prefix.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-full transition-all duration-300 ease-out group",
          isExpanded
            ? "bg-background border border-border shadow-lg w-[280px] sm:w-[320px]"
            : "bg-secondary hover:bg-primary/10 w-10 h-10 sm:w-auto sm:px-3 cursor-pointer"
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {isExpanded ? (
          <>
            <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-full transition-colors flex-shrink-0" aria-label="Close search">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <Input
              ref={inputRef}
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-2 hover:bg-secondary rounded-full transition-colors flex-shrink-0" aria-label="Clear search">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </>
        ) : (
          <>
            <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)] transition-all duration-300 flex-shrink-0 mx-auto sm:mx-0" />
            <span className="hidden sm:block text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
              {t('search')}
            </span>
          </>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-[70vh] flex flex-col">
          <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: '70vh' }}>
            {/* === HISTORY (no query typed) === */}
            {showHistory && (
              <div className="py-1">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tìm kiếm gần đây
                </p>
                {history.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full p-2.5 px-3 flex items-center gap-3 hover:bg-secondary transition-colors"
                  >
                    {item.type === 'user' && item.metadata?.avatarUrl ? (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={item.metadata.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.metadata.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm text-foreground flex-1 text-left truncate">{item.query}</span>
                    <button
                      onClick={(e) => handleRemoveHistory(e, item.id)}
                      className="p-1 hover:bg-destructive/10 rounded-full transition-colors flex-shrink-0"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </button>
                ))}
                <button
                  onClick={clearAll}
                  className="w-full p-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa tất cả lịch sử
                </button>
              </div>
            )}

            {/* === FILTERED HISTORY (typing) === */}
            {showFilteredHistory && (
              <div className="py-1">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Gần đây
                </p>
                {recentFiltered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full p-2.5 px-3 flex items-center gap-3 hover:bg-secondary transition-colors"
                  >
                    {item.type === 'user' && item.metadata?.avatarUrl ? (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={item.metadata.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.metadata.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm text-foreground flex-1 text-left truncate">
                      <HighlightText text={item.query} prefix={searchQuery} />
                    </span>
                    <button
                      onClick={(e) => handleRemoveHistory(e, item.id)}
                      className="p-1 hover:bg-destructive/10 rounded-full transition-colors flex-shrink-0"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </button>
                ))}
              </div>
            )}

            {/* === SERVER RESULTS === */}
            {showResults && (
              <>
                {(showFilteredHistory) && (
                  <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Gợi ý
                  </p>
                )}

                {/* Tabs */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium transition-colors",
                      activeTab === 'users' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    👤 {t('profile')} ({profiles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium transition-colors",
                      activeTab === 'posts' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    📝 {t('posts')} ({posts.length})
                  </button>
                </div>

                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">{t('loading')}</p>
                  </div>
                ) : !hasResults ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t('noResults')}</p>
                  </div>
                ) : activeTab === 'users' ? (
                  <div className="py-1">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => handleProfileClick(profile)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-secondary transition-colors"
                      >
                        <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                          {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {profile.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{profile.username}</p>
                          {profile.full_name && <p className="text-xs text-muted-foreground truncate">{profile.full_name}</p>}
                        </div>
                        <Search className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-1">
                    {posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => handlePostClick(post)}
                        className="w-full p-3 flex items-start gap-3 hover:bg-secondary transition-colors"
                      >
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-medium text-xs text-muted-foreground">{post.profiles?.username}</p>
                          <p className="text-sm text-foreground line-clamp-2 mt-0.5">{post.content}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
