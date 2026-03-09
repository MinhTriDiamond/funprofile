import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import {
  UsersRound,
  Flag,
  Sparkles,
  LogOut,
  Globe,
  Link2,
  BookOpen,
  Shield,
  Crown,
  Settings,
} from 'lucide-react';
import { ecosystemItems, shortcutItems as shortcutConfig, userMenuItems } from '@/config/navigation';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

interface FacebookLeftSidebarProps {
  onItemClick?: () => void;
}

export const LeftSidebar = ({ onItemClick }: FacebookLeftSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { userId, isAuthenticated } = useCurrentUser();
  const { isAdmin } = useAdminRole();

  const { data: profile = null } = useQuery({
    queryKey: ['sidebar-profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, full_name')
        .eq('id', userId!)
        .single();
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    onItemClick?.();
  };

  // Icon map for shortcut items from config
  const iconMap: Record<string, any> = { Crown, Globe, UsersRound, Flag, Link2, BookOpen };

  // Shortcuts from central config
  const shortcutItems = shortcutConfig.map(item => ({
    icon: iconMap[item.iconName] || Globe,
    label: t(item.labelKey as any) || item.labelKey,
    path: item.route,
    color: item.color,
  }));

  return (
    <div className="space-y-3">
      {/* Card 1: FUN ECOSYSTEM */}
      <div className="bg-card/70 rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <img 
            src="/fun-ecosystem-logo-36.webp" 
            alt="FUN Ecosystem" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <h3 
            className="font-black text-[22px] tracking-wider uppercase"
            style={{
              fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
              background: 'linear-gradient(90deg, #FF6B9D 0%, #C44FE2 15%, #7B68EE 30%, #00CED1 50%, #98FB98 70%, #FFFF00 85%, #FFB347 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(0 0 8px rgba(255, 182, 193, 0.5))',
            }}
          >
            {t('funEcosystem')}
          </h3>
        </div>
        <div className="space-y-1">
          {ecosystemItems.map((shortcut) => (
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
                  ? 'bg-gradient-to-r from-yellow-400/10 to-amber-400/10 hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] border border-yellow-400/30 hover:border-primary' 
                  : 'hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)]'
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
                  className="w-9 h-9 rounded-full object-cover group-hover:shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-shadow duration-300"
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
      <div className="bg-card/70 rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <h3 className="font-bold text-sm mb-3 text-muted-foreground">
          {t('yourShortcuts')}
        </h3>
        <div className="space-y-1">
          {profile && (
            <button
              onClick={() => { navigate(`/profile/${profile.id}`); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-300"
            >
              <Avatar className="w-9 h-9 ring-2 ring-yellow-400/50">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{profile.display_name || profile.username}</span>
            </button>
          )}

          {shortcutItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-300"
            >
              <div className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card 3: Menu */}
      <div className="bg-card/70 rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <h3 className="font-bold text-sm mb-3 text-muted-foreground">
          Menu
        </h3>
        <div className="space-y-1">
          <div className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-blue-500">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <LanguageSwitcher variant="dropdown" />
            </div>
          </div>

          <button
            onClick={() => { navigate('/settings'); onItemClick?.(); }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-gray-600">
              <Settings className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">Cài đặt</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => { navigate('/admin'); onItemClick?.(); }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(251,191,36,0.5)] transition-all duration-300 text-amber-500"
            >
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">Admin Dashboard</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-all duration-300 text-destructive"
            >
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{t('signOut')}</span>
            </button>
          )}
        </div>

        <div className="pt-4 text-xs text-muted-foreground border-t border-border mt-3">
          <p>{t('privacyPolicy')} · {t('termsOfService')}</p>
          <p className="mt-1">FUN Profile © 2025</p>
        </div>
      </div>
    </div>
  );
};

/** @deprecated Use LeftSidebar instead */
export const FacebookLeftSidebar = LeftSidebar;
