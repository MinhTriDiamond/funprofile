import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';
import { SearchDialog } from './SearchDialog';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Home,
  Users,
  MessageCircle,
  Menu,
  LogOut,
  Settings,
  Wallet,
  Shield,
} from 'lucide-react';
import funFarmLogo from '@/assets/fun-farm-logo.webp';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Profile {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

export const FacebookNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setUserId(session.user.id);
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      } else {
        setProfile(null);
        setUserId(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, full_name')
      .eq('id', id)
      .single();
    if (data) setProfile(data);
  };

  const checkAdminRole = async (id: string) => {
    const { data } = await supabase.rpc('has_role', { _user_id: id, _role: 'admin' });
    setIsAdmin(data === true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

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
        {/* Left Section - Logo & Search */}
        <div className="flex items-center gap-2 flex-shrink-0 md:w-[280px]">
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
            <SearchDialog />
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
            <SearchDialog />
          </div>

          {/* Messenger */}
          <button className="fb-icon-btn hidden md:flex" aria-label={t('notifications')}>
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Wallet */}
          <button
            onClick={() => navigate('/wallet')}
            className="fb-icon-btn hidden md:flex"
            aria-label={t('wallet')}
          >
            <Wallet className="w-5 h-5 text-gold" />
          </button>

          {/* Profile Menu */}
          {isLoggedIn && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none" aria-label={t('profile')}>
                  <Avatar className="w-10 h-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                    <AvatarImage src={profile.avatar_url || ''} alt={profile.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-2">
                <DropdownMenuItem
                  onClick={() => navigate(`/profile/${userId}`)}
                  className="p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{profile.full_name || profile.username}</p>
                      <p className="text-sm text-muted-foreground">{t('profile')}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="p-3 cursor-pointer text-primary"
                  >
                    <Shield className="w-5 h-5 mr-3" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigate('/wallet')}
                  className="p-3 cursor-pointer"
                >
                  <Wallet className="w-5 h-5 mr-3 text-gold" />
                  <span>{t('wallet')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <Settings className="w-5 h-5 mr-3" />
                  <span>{t('settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                  <LanguageSwitcher variant="full" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="p-3 cursor-pointer text-destructive"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  <span>{t('signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
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
