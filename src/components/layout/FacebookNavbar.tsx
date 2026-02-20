import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { InlineSearch } from './InlineSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import {
  Home,
  Users,
  MessageCircle,
  Menu,
  Wallet,
  Film,
  User,
  LogOut,
  Globe,
  Sparkles,
  Shield,
} from 'lucide-react';
import { AngelChatWidget } from '@/components/angel-ai';
import { GiftNavButton } from '@/components/donations/GiftNavButton';
import { ValentineMusicButton } from './ValentineMusicButton';
import { TetBackgroundSelector } from './TetBackgroundSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// Use direct paths for logos to ensure consistency across all environments

export const FacebookNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAngelChatOpen, setIsAngelChatOpen] = useState(false);

  // MED-5: Track userId via state updated only on auth change (not every render)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Sync auth state (lightweight — only sets userId, no extra DB calls)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setCurrentUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // MED-5: Profile cached via React Query — only re-fetches when userId changes or data is stale (5 min)
  const { data: profile } = useQuery({
    queryKey: ['navbar-profile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, display_name')
        .eq('id', currentUserId)
        .single();
      return data ?? null;
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000,
  });

  // MED-5: Admin check also cached — admin role rarely changes
  const { data: isAdmin } = useQuery({
    queryKey: ['navbar-admin', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;
      const { data } = await supabase.rpc('has_role', {
        _user_id: currentUserId,
        _role: 'admin'
      });
      return !!data;
    },
    enabled: !!currentUserId,
    staleTime: 10 * 60_000, // 10 minutes — admin role rarely changes
    gcTime: 15 * 60_000,
  });

  const isActive = (path: string) => location.pathname === path;

  // Language options with country flag images (using flagcdn.com for consistent display)
  const languageOptions = [
    { code: 'vi' as const, name: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png' },
    { code: 'en' as const, name: 'English', flagUrl: 'https://flagcdn.com/w40/us.png' },
    { code: 'zh' as const, name: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png' },
    { code: 'ja' as const, name: '日本語', flagUrl: 'https://flagcdn.com/w40/jp.png' },
    { code: 'ko' as const, name: '한국어', flagUrl: 'https://flagcdn.com/w40/kr.png' },
    { code: 'th' as const, name: 'ไทย', flagUrl: 'https://flagcdn.com/w40/th.png' },
    { code: 'id' as const, name: 'Indonesia', flagUrl: 'https://flagcdn.com/w40/id.png' },
    { code: 'fr' as const, name: 'Français', flagUrl: 'https://flagcdn.com/w40/fr.png' },
    { code: 'es' as const, name: 'Español', flagUrl: 'https://flagcdn.com/w40/es.png' },
    { code: 'de' as const, name: 'Deutsch', flagUrl: 'https://flagcdn.com/w40/de.png' },
    { code: 'pt' as const, name: 'Português', flagUrl: 'https://flagcdn.com/w40/br.png' },
    { code: 'ru' as const, name: 'Русский', flagUrl: 'https://flagcdn.com/w40/ru.png' },
    { code: 'ar' as const, name: 'العربية', flagUrl: 'https://flagcdn.com/w40/sa.png' },
  ];

  // Navigation items for center nav (Desktop only)
  const iconNavItems = [
    { icon: Home, path: '/', label: t('home') },
    { icon: Users, path: '/friends', label: t('friends') },
    { icon: Film, path: '/reels', label: 'Reels' },
    { icon: MessageCircle, path: '/chat', label: 'Chat' },
    // Bell (Notification) is handled separately with NotificationDropdown component
    { icon: Wallet, path: '/wallet', label: 'Wallet' },
  ];

  // Mint nav item with GIF logo (inserted after iconNavItems in render)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 fb-header h-12 md:h-14 safe-area-top">
      <div className="h-full max-w-screen-2xl mx-auto px-2 sm:px-4 flex items-center justify-between">
        {/* Left Section - Menu Button & Logo & Search */}
        <div className="flex items-center gap-2 flex-shrink-0 md:w-[280px]">
          {/* Menu Button - Left of Logo (Mobile/Tablet only) */}
          {isMobileOrTablet && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <button 
                  className="fun-icon-btn flex-shrink-0"
                  aria-label="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-4 overflow-y-auto">
                <FacebookLeftSidebar onItemClick={() => setIsSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          )}

          {/* Logo - use direct path for consistency across all environments */}
          <img
            src="/fun-profile-logo-40.webp"
            alt="FUN Profile"
            width={36}
            height={36}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
            loading="eager"
          />
          <div className="hidden sm:block">
            <InlineSearch />
          </div>
        </div>

        {/* Center Section - Navigation (Desktop only, hidden on tablet) */}
        <nav className="hidden lg:flex items-center justify-center flex-1 max-w-[700px] h-full gap-1">
          {/* Icon Navigation Items (Home, Friends, Chat, Wallet) */}
          <TooltipProvider delayDuration={200}>
            {iconNavItems.map((item) => (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                    className={`flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group ${
                      isActive(item.path)
                        ? 'text-primary-foreground bg-primary border-[#C9A84C]'
                        : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-[#C9A84C]/50'
                    }`}
                  >
                    <item.icon className={`w-6 h-6 transition-all duration-300 ${
                      isActive(item.path) 
                        ? '' 
                        : 'group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]'
                    }`} />
                    {isActive(item.path) && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-gold to-primary rounded-t-full" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card text-card-foreground border border-border">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Mint Button - GIF Logo + Gold text */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/mint')}
                  aria-label="Mint FUN Money"
                  className={`flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group ${
                    isActive('/mint')
                      ? 'text-primary-foreground bg-primary border-[#C9A84C]'
                      : 'text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-yellow-500/10 border-transparent hover:border-amber-500/50'
                  }`}
                >
                  <img
                    src={new URL('@/assets/tokens/fun-ecosystem-mint.gif', import.meta.url).href}
                    alt="Mint"
                    className="w-7 h-7 rounded-full"
                  />
                  {isActive('/mint') && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 rounded-t-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
                <p className="text-amber-500 font-semibold">Mint</p>
              </TooltipContent>
            </Tooltip>

            {/* ANGEL AI Button - Special styling */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsAngelChatOpen(true)}
                  aria-label="ANGEL AI"
                  className="flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 border-transparent hover:border-amber-500/50"
                >
                  <div className="relative">
                    <img 
                      src="/angel-ai-logo-36.png" 
                      alt="ANGEL AI" 
                      className="w-7 h-7 rounded-full border border-amber-500/50 group-hover:border-amber-400 transition-all duration-300 group-hover:shadow-[0_0_12px_hsl(45_93%_47%/0.5)]"
                    />
                    <Sparkles className="absolute -top-0.5 -right-0.5 w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500">
                <p className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> ANGEL AI
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 md:w-[280px] justify-end">
          {/* Search button for mobile */}
          <div className="sm:hidden">
            <InlineSearch />
          </div>

          {isMobileOrTablet && <TetBackgroundSelector variant="desktop" />}
          {isMobileOrTablet && <ValentineMusicButton variant="desktop" />}
          {isMobileOrTablet && (
            <button 
              className="fun-icon-btn-gold group" 
              aria-label="Wallet"
              onClick={() => navigate('/wallet')}
            >
              <Wallet className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
            </button>
          )}

          {/* Notification for mobile/tablet */}
          {isMobileOrTablet && <NotificationDropdown />}

          {/* Avatar button - mobile/tablet - go to profile like Facebook */}
          {isMobileOrTablet && isLoggedIn && currentUserId && (
            <button
              onClick={() => navigate(`/profile/${currentUserId}`)}
              aria-label="My Profile"
              className="flex-shrink-0"
            >
              <Avatar className="w-8 h-8 border-2 border-gold/40 hover:border-gold transition-colors">
                <AvatarImage src={profile?.avatar_url || ''} sizeHint="sm" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          )}

          {/* Desktop only: Gift + Notification Bell + Avatar with Dropdown */}
          {!isMobileOrTablet && isLoggedIn && (
            <div className="flex items-center gap-3">
              <GiftNavButton variant="desktop" />
              <TetBackgroundSelector variant="desktop" />
              <ValentineMusicButton variant="desktop" />
              <NotificationDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex-shrink-0" aria-label="Profile Menu">
                    <Avatar className="w-9 h-9 border-2 border-gold/30 hover:border-gold transition-colors cursor-pointer">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {profile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border border-border shadow-lg z-50">
                  {/* Go to Profile - with user avatar and name */}
                  <DropdownMenuItem 
                    onClick={() => navigate(`/profile/${currentUserId}`)}
                    className="cursor-pointer gap-3 p-3"
                  >
                    <Avatar className="w-10 h-10 border-2 border-gold/30">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {profile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">{profile?.display_name || profile?.username || 'User'}</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Language Switcher - Collapsible */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-between w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>{t('language')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <img 
                            src={languageOptions.find(l => l.code === language)?.flagUrl} 
                            alt={language}
                            className="w-5 h-4 object-cover rounded-sm"
                          />
                          <span className="text-xs text-muted-foreground">{language.toUpperCase()}</span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="left" align="start" className="min-w-[200px]">
                      <div className="grid grid-cols-2 gap-1 p-2">
                        {languageOptions.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                              language === lang.code
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-accent text-foreground'
                            }`}
                          >
                            <img 
                              src={lang.flagUrl} 
                              alt={lang.name}
                              className="w-5 h-4 object-cover rounded-sm"
                            />
                            <span>{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Admin Dashboard - Only show for admins */}
                  {isAdmin && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/admin')}
                      className="cursor-pointer gap-2 text-amber-500 focus:text-amber-600"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Logout */}
                  <DropdownMenuItem 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/auth');
                    }}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Sign In Button - Only show when not logged in */}
          {!isLoggedIn && (
            <>
              {!isMobileOrTablet && <TetBackgroundSelector variant="desktop" />}
              {!isMobileOrTablet && <ValentineMusicButton variant="desktop" />}
              <Button
                onClick={() => navigate('/auth')}
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                {t('signIn')}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* ANGEL AI Chat Widget */}
      <AngelChatWidget isOpen={isAngelChatOpen} onClose={() => setIsAngelChatOpen(false)} />
    </header>
  );
};
