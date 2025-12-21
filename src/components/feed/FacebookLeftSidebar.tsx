import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Users,
  UsersRound,
  Store,
  PlaySquare,
  Clock,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Gamepad2,
  Heart,
  Flag,
  Wallet,
  Sparkles,
} from 'lucide-react';
import funEcosystemLogo from '@/assets/fun-ecosystem-logo.webp';
import funFarmLogo from '@/assets/fun-farm-logo.webp';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface FacebookLeftSidebarProps {
  onItemClick?: () => void;
}

export const FacebookLeftSidebar = ({ onItemClick }: FacebookLeftSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const menuItems = [
    { icon: Users, label: t('friends'), path: '/friends', color: 'text-blue-500' },
    { icon: UsersRound, label: t('groups'), path: '/groups', color: 'text-blue-500' },
    { icon: Store, label: 'Marketplace', path: '/marketplace', color: 'text-blue-500' },
    { icon: PlaySquare, label: 'Watch', path: '/watch', color: 'text-blue-500' },
    { icon: Clock, label: t('memories'), path: '/memories', color: 'text-blue-500' },
    { icon: Bookmark, label: t('saved'), path: '/saved', color: 'text-purple-500' },
  ];

  const moreItems = [
    { icon: CalendarDays, label: t('events'), path: '/events', color: 'text-red-500' },
    { icon: Gamepad2, label: 'Gaming', path: '/gaming', color: 'text-blue-500' },
    { icon: Heart, label: 'Fundraisers', path: '/fundraisers', color: 'text-pink-500' },
    { icon: Flag, label: 'Pages', path: '/pages', color: 'text-orange-500' },
    { icon: Wallet, label: t('wallet'), path: '/wallet', color: 'text-gold' },
  ];

  const shortcuts = [
    { 
      name: 'Law of Light', 
      avatar: '/fun-profile-logo-40.webp',
      path: '/law-of-light?view=true',
      isExternal: false,
      isSpecial: true
    },
    { 
      name: 'About FUN Profile', 
      avatar: '/fun-profile-logo-40.webp',
      path: '/about',
      isExternal: false,
      isSpecial: false
    },
    { 
      name: 'FUN Play', 
      avatar: '/fun-play-logo-36.webp',
      path: 'https://play.fun.rich',
      isExternal: true,
      isSpecial: false
    },
    { 
      name: 'FUN Planet', 
      avatar: '/fun-planet-logo-36.webp',
      path: 'https://planet.fun.rich',
      isExternal: true,
      isSpecial: false
    },
    { 
      name: 'FUN Farm', 
      avatar: funFarmLogo,
      path: 'https://farm.fun.rich',
      isExternal: true,
      isSpecial: false
    },
  ];

  return (
    <div className="space-y-3">
      {/* Card 1: FUN ECOSYSTEM */}
      <div className="bg-card rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={funEcosystemLogo} 
            alt="FUN Ecosystem" 
            className="w-8 h-8 rounded-lg object-cover"
          />
          <h3 className="font-bold text-lg text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
            {t('funEcosystem')}
          </h3>
        </div>
        <div className="space-y-1">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.name}
              onClick={() => {
                if (shortcut.isExternal) {
                  window.open(shortcut.path, '_blank', 'noopener,noreferrer');
                } else {
                  navigate(shortcut.path);
                }
                onItemClick?.();
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group ${
                shortcut.isSpecial 
                  ? 'bg-gradient-to-r from-yellow-400/10 to-amber-400/10 hover:from-yellow-400/20 hover:to-amber-400/20 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] border border-yellow-400/30' 
                  : 'hover:bg-secondary hover:shadow-[0_0_15px_rgba(250,204,21,0.4)]'
              }`}
            >
              {shortcut.isSpecial ? (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                     style={{
                       background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, rgba(250,204,21,0.1) 100%)',
                       boxShadow: '0 0 15px rgba(250,204,21,0.4)'
                     }}>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
              ) : (
                <img
                  src={shortcut.avatar}
                  alt={shortcut.name}
                  width={36}
                  height={36}
                  loading="lazy"
                  className="w-9 h-9 rounded-lg object-cover group-hover:shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-shadow duration-300"
                />
              )}
              <span className={`font-medium text-sm transition-colors duration-300 ${
                shortcut.isSpecial 
                  ? 'text-yellow-400 group-hover:text-yellow-300 font-semibold' 
                  : 'group-hover:text-primary'
              }`}>
                {shortcut.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Card 2: Your Shortcuts */}
      <div className="bg-card rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <h3 className="font-bold text-sm mb-3 text-muted-foreground">
          {t('yourShortcuts')}
        </h3>
        <div className="space-y-1">
          {/* User Profile */}
          {profile && (
            <button
              onClick={() => { navigate(`/profile/${profile.id}`); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Avatar className="w-9 h-9">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{profile.full_name || profile.username}</span>
            </button>
          )}

          {/* Menu Items */}
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

          {/* More Items */}
          {showMore && moreItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

          {/* See More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <ChevronDown className={`w-5 h-5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </div>
            <span className="font-medium text-sm">{showMore ? t('seeLess') : t('seeMore')}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-4 text-xs text-muted-foreground border-t border-border mt-3">
          <p>{t('privacyPolicy')} · {t('termsOfService')}</p>
          <p className="mt-1">FUN Profile © 2025</p>
        </div>
      </div>
    </div>
  );
};
