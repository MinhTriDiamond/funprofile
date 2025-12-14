import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

export const FacebookLeftSidebar = () => {
  const navigate = useNavigate();
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
    { icon: Users, label: 'Bạn bè', path: '/friends', color: 'text-blue-500' },
    { icon: UsersRound, label: 'Nhóm', path: '/groups', color: 'text-blue-500' },
    { icon: Store, label: 'Marketplace', path: '/marketplace', color: 'text-blue-500' },
    { icon: PlaySquare, label: 'Watch', path: '/watch', color: 'text-blue-500' },
    { icon: Clock, label: 'Kỷ niệm', path: '/memories', color: 'text-blue-500' },
    { icon: Bookmark, label: 'Đã lưu', path: '/saved', color: 'text-purple-500' },
  ];

  const moreItems = [
    { icon: CalendarDays, label: 'Sự kiện', path: '/events', color: 'text-red-500' },
    { icon: Gamepad2, label: 'Chơi game', path: '/gaming', color: 'text-blue-500' },
    { icon: Heart, label: 'Quyên góp', path: '/fundraisers', color: 'text-pink-500' },
    { icon: Flag, label: 'Trang', path: '/pages', color: 'text-orange-500' },
    { icon: Wallet, label: 'Ví Crypto', path: '/wallet', color: 'text-gold' },
  ];

  const shortcuts = [
    { 
      name: 'About FUN Profile', 
      avatar: '/fun-profile-logo-small.webp',
      path: '/about',
      isExternal: false
    },
    { 
      name: 'FUN Play', 
      avatar: '/fun-play-logo.png',
      path: 'https://play.fun.rich',
      isExternal: true
    },
    { 
      name: 'FUN Planet', 
      avatar: '/fun-planet-logo.png',
      path: 'https://planet.fun.rich',
      isExternal: true
    },
  ];

  return (
    <div className="space-y-3">
      {/* Card 1: FUN ECOSYSTEM */}
      <div className="bg-card rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <h3 className="font-bold text-lg mb-3 text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          FUN ECOSYSTEM
        </h3>
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
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all duration-300 group"
            >
              <img
                src={shortcut.avatar}
                alt={shortcut.name}
                width={36}
                height={36}
                loading="lazy"
                className="w-9 h-9 rounded-lg object-cover group-hover:shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-shadow duration-300"
              />
              <span className="font-medium text-sm group-hover:text-primary transition-colors duration-300">{shortcut.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card 2: Lối tắt của bạn */}
      <div className="bg-card rounded-xl border-2 border-yellow-400/50 p-4 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300">
        <h3 className="font-bold text-sm mb-3 text-muted-foreground">
          Lối tắt của bạn
        </h3>
        <div className="space-y-1">
          {/* User Profile */}
          {profile && (
            <button
              onClick={() => navigate(`/profile/${profile.id}`)}
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
              onClick={() => navigate(item.path)}
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
              onClick={() => navigate(item.path)}
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
            <span className="font-medium text-sm">{showMore ? 'Ẩn bớt' : 'Xem thêm'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-4 text-xs text-muted-foreground border-t border-border mt-3">
          <p>Privacy · Terms · Advertising · Ad Choices · Cookies</p>
          <p className="mt-1">FUN Profile © 2025</p>
        </div>
      </div>
    </div>
  );
};
