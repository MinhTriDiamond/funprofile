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
    { name: 'FUN Profile Community', avatar: '/fun-profile-logo.jpg' },
  ];

  return (
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

      {/* Divider */}
      <div className="border-t border-border my-3" />

      {/* Shortcuts */}
      <h3 className="px-2 text-muted-foreground font-semibold text-sm mb-2">Lối tắt của bạn</h3>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.name}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <img
            src={shortcut.avatar}
            alt={shortcut.name}
            className="w-9 h-9 rounded-lg object-cover"
          />
          <span className="font-medium text-sm">{shortcut.name}</span>
        </button>
      ))}

      {/* Footer */}
      <div className="pt-4 px-2 text-xs text-muted-foreground">
        <p>Privacy · Terms · Advertising · Ad Choices · Cookies</p>
        <p className="mt-1">FUN Profile © 2025</p>
      </div>
    </div>
  );
};
