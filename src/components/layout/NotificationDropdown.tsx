/**
 * NotificationDropdown — Always navigates to /notifications page (both mobile & desktop)
 */

import { Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NotificationDropdownProps {
  centerNavStyle?: boolean;
  isActiveRoute?: boolean;
}

export const NotificationDropdown = ({ centerNavStyle = false, isActiveRoute = false }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const { userId } = useCurrentUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (isMounted && count !== null) {
        if (count > prevCountRef.current) {
          setHasNewNotification(true);
          setTimeout(() => setHasNewNotification(false), 3000);
        }
        prevCountRef.current = count;
        setUnreadCount(count);
      }
    };

    fetchCount();

    const channel = supabase
      .channel(`notif-count-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { if (isMounted) fetchCount(); })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const badge = unreadCount > 0 ? (
    <span className={cn(
      "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold transition-all duration-300",
      hasNewNotification ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" : "bg-destructive text-destructive-foreground"
    )}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  ) : null;

  const handleClick = () => navigate('/notifications');

  if (centerNavStyle) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group",
          isActiveRoute ? 'text-primary-foreground bg-primary border-gold'
            : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-gold/50'
        )}
        aria-label="Thông báo"
      >
        <Bell className={cn(
          "w-6 h-6 transition-all duration-300",
          isActiveRoute ? "text-primary-foreground" : "group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]",
          hasNewNotification && "drop-shadow-[0_0_8px_hsl(48_96%_53%/0.6)]"
        )} />
        {badge}
        {isActiveRoute && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-gold to-primary rounded-t-full" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "h-11 w-11 relative transition-all duration-300 group flex items-center justify-center rounded-full",
        "text-foreground hover:text-primary hover:bg-primary/10"
      )}
      aria-label="Thông báo"
    >
      <Bell className={cn(
        "w-6 h-6 transition-all duration-300 text-primary",
        "group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]",
        hasNewNotification && "drop-shadow-[0_0_8px_hsl(48_96%_53%/0.6)]"
      )} />
      {badge}
    </button>
  );
};
