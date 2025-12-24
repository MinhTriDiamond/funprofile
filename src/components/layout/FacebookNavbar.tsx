import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InlineSearch } from './InlineSearch';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import {
  Home,
  Users,
  MessageCircle,
  Menu,
} from 'lucide-react';
import funFarmLogo from '@/assets/fun-farm-logo.webp';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';

export const FacebookNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Navigation items with icons for Home and Friends
  const iconNavItems = [
    { icon: Home, path: '/', label: t('home') },
    { icon: Users, path: '/friends', label: t('friends') },
  ];

  // Logo navigation items for FUN Play, FUN Farm, FUN Planet
  const logoNavItems = [
    { 
      logo: '/fun-play-logo-36.webp', 
      label: 'FUN Play', 
      path: 'https://play.fun.rich',
      isExternal: true 
    },
    { 
      logo: funFarmLogo, 
      label: 'FUN Farm', 
      path: 'https://farm.fun.rich',
      isExternal: true 
    },
    { 
      logo: '/fun-planet-logo-36.webp', 
      label: 'FUN Planet', 
      path: 'https://planet.fun.rich',
      isExternal: true 
    },
  ];

  const handleLogoClick = (item: typeof logoNavItems[0]) => {
    if (item.isExternal) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 fb-header h-12 md:h-14 safe-area-top">
      <div className="h-full max-w-screen-2xl mx-auto px-2 sm:px-4 flex items-center justify-between">
        {/* Left Section - Menu Button & Logo & Search */}
        <div className="flex items-center gap-2 flex-shrink-0 md:w-[280px]">
          {/* Menu Button - Left of Logo */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <button 
                className="fb-icon-btn flex-shrink-0"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-4 overflow-y-auto">
              <FacebookLeftSidebar onItemClick={() => setIsSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Logo */}
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

        {/* Center Section - Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 max-w-[600px] h-full gap-2">
          <TooltipProvider delayDuration={100}>
            {/* Icon Navigation Items (Home, Friends) */}
            {iconNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={`flex-1 h-full max-w-[80px] flex items-center justify-center relative transition-colors ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-secondary rounded-lg'
                }`}
              >
                <item.icon className="w-6 h-6" />
                {isActive(item.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
                )}
              </button>
            ))}

            {/* Logo Navigation Items (FUN Play, FUN Farm, FUN Planet) */}
            {logoNavItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleLogoClick(item)}
                    aria-label={item.label}
                    className="flex-1 h-full max-w-[80px] flex items-center justify-center relative group"
                  >
                    <img
                      src={item.logo}
                      alt={item.label}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-lg object-cover transition-all duration-300 
                        group-hover:shadow-[0_0_20px_rgba(34,197,94,0.7),0_0_30px_rgba(250,204,21,0.5)] 
                        group-hover:scale-110
                        group-hover:brightness-110"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  className="bg-white border-2 border-yellow-500 text-primary font-medium px-3 py-1.5 text-sm shadow-lg"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 md:w-[280px] justify-end">
          {/* Search button for mobile */}
          <div className="sm:hidden">
            <InlineSearch />
          </div>

          {/* Chat/Messenger */}
          <button className="fb-icon-btn" aria-label="Messenger">
            <MessageCircle className="w-5 h-5" />
          </button>

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
