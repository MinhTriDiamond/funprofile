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
  PlaySquare,
  Store,
  Gamepad2,
  MessageCircle,
  Menu,
  LogOut,
  Settings,
  Wallet,
  Shield,
  Globe,
} from 'lucide-react';

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

  const navItems = [
    { icon: Home, path: '/', label: t('home') },
    { icon: Users, path: '/friends', label: t('friends') },
    { icon: PlaySquare, path: '/watch', label: 'Watch' },
    { icon: Store, path: '/marketplace', label: 'Marketplace' },
    { icon: Gamepad2, path: '/gaming', label: 'Gaming' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 fb-header h-14">
      <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
        {/* Left Section - Logo & Search */}
        <div className="flex items-center gap-2 w-[280px]">
          <img
            src="/fun-profile-logo-40.webp"
            alt="FUN Profile"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={() => navigate('/')}
            fetchPriority="high"
          />
          <SearchDialog />
        </div>

        {/* Center Section - Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-1 max-w-[600px] h-full">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`flex-1 h-full flex items-center justify-center relative transition-colors ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-secondary rounded-lg mx-1'
              }`}
            >
              <item.icon className="w-6 h-6" />
              {isActive(item.path) && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 w-[280px] justify-end">
          {/* Menu button for mobile */}
          <button className="fb-icon-btn md:hidden" aria-label="Menu">
            <Menu className="w-5 h-5" />
          </button>

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
