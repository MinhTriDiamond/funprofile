import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';
import { getNavbarLogoUrl } from '@/lib/staticImageOptimizer';

export const FacebookNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setCurrentUserId(session.user.id);
        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setCurrentUserId(session.user.id);
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      } else {
        setProfile(null);
        setCurrentUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Navigation items with icons for Home and Friends
  const iconNavItems = [
    { icon: Home, path: '/', label: t('home') },
    { icon: Users, path: '/friends', label: t('friends') },
  ];

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

          {/* Logo - optimized for display size */}
          <img
            src={getNavbarLogoUrl('/fun-profile-logo-40.webp')}
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
        <nav className="hidden lg:flex items-center justify-center flex-1 max-w-[400px] h-full gap-2">
          {/* Icon Navigation Items (Home, Friends) */}
          {iconNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-lg group ${
                isActive(item.path)
                  ? 'text-primary-foreground bg-primary'
                  : 'text-foreground hover:text-primary hover:bg-primary/10'
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
          ))}
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 md:w-[280px] justify-end">
          {/* Search button for mobile */}
          <div className="sm:hidden">
            <InlineSearch />
          </div>

          {/* Mobile/Tablet: Wallet icon | Desktop: Chat icon */}
          {isMobileOrTablet ? (
            <button 
              className="fun-icon-btn-gold group" 
              aria-label="Wallet"
              onClick={() => navigate('/wallet')}
            >
              <Wallet className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
            </button>
          ) : (
            <button 
              className="fun-icon-btn group" 
              aria-label="Messenger"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-white transition-all duration-300" />
            </button>
          )}

          {/* Desktop only: Notification, Wallet, Avatar */}
          {!isMobileOrTablet && isLoggedIn && (
            <>
              {/* Notification */}
              <NotificationDropdown />

              {/* Wallet */}
              <button 
                className="fun-icon-btn-gold group" 
                aria-label="Wallet"
                onClick={() => navigate('/wallet')}
              >
                <Wallet className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
              </button>

              {/* Avatar */}
              <button
                onClick={() => navigate(`/profile/${currentUserId}`)}
                className="flex-shrink-0"
                aria-label="Profile"
              >
                <Avatar className="w-9 h-9 border-2 border-gold/30 hover:border-gold transition-colors cursor-pointer">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </>
          )}

          {/* Sign In Button - Only show when not logged in */}
          {!isLoggedIn && (
            <Button
              onClick={() => navigate('/auth')}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {t('signIn')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
