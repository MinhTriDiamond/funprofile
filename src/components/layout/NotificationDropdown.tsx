/**
 * Facebook-Style NotificationDropdown
 * Features: Time grouping, post snippets, friend request inline actions, tabs filter, expand/collapse
 */

import { Bell, MoreHorizontal, Settings, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { 
  NotificationWithDetails, 
  FilterTab,
  NotificationGroups
} from './notifications/types';
import {
  groupNotificationsByTime,
} from './notifications/utils';
import { NotificationSection } from './notifications/NotificationSection';
import { FriendRequestItem } from './notifications/FriendRequestItem';

interface NotificationDropdownProps {
  centerNavStyle?: boolean;
  isActiveRoute?: boolean;
}

export const NotificationDropdown = ({ centerNavStyle = false, isActiveRoute = false }: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const isMobileOrTablet = useIsMobileOrTablet();
  // QW-1+QW-5: Track channel via ref for proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Keep a ref to unreadCount so fetchNotifications doesn't need it as a dep
  const unreadCountRef = useRef(0);

  // QW-1 fix: removed `unreadCount` from deps — use functional updater instead
  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        post_id,
        metadata,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          avatar_url,
          full_name
        ),
        post:posts!notifications_post_id_fkey (
          id,
          content
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as unknown as NotificationWithDetails[]);
      const newUnreadCount = data.filter(n => !n.read).length;
      
      // Use ref to compare without adding unreadCount as dep
      if (newUnreadCount > unreadCountRef.current) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
      }
      
      unreadCountRef.current = newUnreadCount;
      setUnreadCount(newUnreadCount);
    }
  }, []); // stable — no state deps

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      await fetchNotifications();
      if (!isMounted) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // QW-5: cleanup previous channel before creating new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => { if (isMounted) fetchNotifications(); }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => { if (isMounted) fetchNotifications(); }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setup();

    // QW-1: proper cleanup on unmount — channel is always removed
    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchNotifications]); // fetchNotifications is now stable (no state deps)

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId)
      .eq('read', false);
    
    fetchNotifications();
  };

  const handleNotificationClick = async (notification: NotificationWithDetails) => {
    await markAsRead(notification.id);
    setOpen(false);
    
    if (notification.type === 'live_started' && notification.post_id) {
      const { data: session } = await supabase
        .from('live_sessions')
        .select('id, status')
        .eq('post_id', notification.post_id)
        .single();
      
      if (session?.status === 'live') {
        navigate(`/live/${session.id}`);
      } else {
        navigate(`/post/${notification.post_id}`);
      }
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate(`/profile/${notification.actor?.id}`);
    } else if (notification.type === 'reward_approved' || notification.type === 'reward_rejected') {
      navigate('/wallet');
    }
  };

  const handleAcceptFriendRequest = async (notification: NotificationWithDetails) => {
    if (!currentUserId) return;
    
    try {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', notification.actor.id)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();

      if (friendship) {
        await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendship.id);
          
        await markAsRead(notification.id);
        toast.success('Đã chấp nhận lời mời kết bạn!');
        fetchNotifications();
      } else {
        toast.error('Không tìm thấy lời mời kết bạn');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleRejectFriendRequest = async (notification: NotificationWithDetails) => {
    if (!currentUserId) return;
    
    try {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', notification.actor.id)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();

      if (friendship) {
        await supabase
          .from('friendships')
          .delete()
          .eq('id', friendship.id);
          
        await markAsRead(notification.id);
        toast.success('Đã xóa lời mời kết bạn');
        fetchNotifications();
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  // Filter and group notifications
  const { friendRequests, otherNotifications } = useMemo(() => {
    const filtered = activeTab === 'unread' 
      ? notifications.filter(n => !n.read)
      : notifications;
    
    return {
      friendRequests: filtered.filter(n => n.type === 'friend_request' && !n.read),
      otherNotifications: filtered.filter(n => n.type !== 'friend_request' || n.read)
    };
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => 
    groupNotificationsByTime(otherNotifications),
    [otherNotifications]
  );

  // Mobile/Tablet: Navigate directly to notifications page
  const handleBellClick = () => {
    if (isMobileOrTablet) {
      navigate('/notifications');
    }
  };

  // Popover content shared between centerNav and default styles
  const PopoverContentInner = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="font-bold text-xl text-foreground">Thông báo</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={markAllAsRead} className="gap-2">
              <Check className="w-4 h-4" />
              Đánh dấu tất cả đã đọc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setOpen(false); navigate('/notifications'); }} className="gap-2">
              <Settings className="w-4 h-4" />
              Cài đặt thông báo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-border/30">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "rounded-full px-4 h-8 text-sm font-medium transition-colors",
            activeTab === 'all' 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={cn(
            "rounded-full px-4 h-8 text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === 'unread' 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Chưa đọc
          {unreadCount > 0 && (
            <span className={cn(
              "text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center",
              activeTab === 'unread'
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <ScrollArea className={cn(
        "transition-all duration-300",
        isExpanded ? "h-[70vh] sm:h-[75vh]" : "h-[400px] sm:h-[450px]"
      )}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {/* Friend Requests Section */}
            {friendRequests.length > 0 && (
              <div className="border-b border-border/30 pb-2">
                <div className="flex justify-between items-center px-4 py-2">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Lời mời kết bạn
                  </span>
                  <button 
                    onClick={() => navigate('/friends?tab=requests')}
                    className="text-primary text-sm hover:underline"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5">
                  {friendRequests.slice(0, 3).map((notification) => (
                    <FriendRequestItem
                      key={notification.id}
                      notification={notification}
                      onAccept={handleAcceptFriendRequest}
                      onReject={handleRejectFriendRequest}
                      onNavigate={handleNotificationClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped Notifications */}
            {(['new', 'today', 'yesterday', 'thisWeek', 'earlier'] as const).map((key) => (
              <NotificationSection
                key={key}
                sectionKey={key}
                notifications={groupedNotifications[key]}
                onNotificationClick={handleNotificationClick}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRejectFriendRequest={handleRejectFriendRequest}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t border-border/30">
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary/80 hover:bg-primary/5 font-medium"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Thu gọn' : 'Xem tất cả thông báo'}
          </Button>
        </div>
      )}
    </>
  );

  // On mobile/tablet, render a simple button that navigates to notifications page
  if (isMobileOrTablet) {
    return (
      <button 
        onClick={handleBellClick}
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
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold transition-all duration-300",
            hasNewNotification 
              ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" 
              : "bg-destructive text-destructive-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Desktop: Show popover dropdown
  if (centerNavStyle) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group",
              open
                ? 'text-primary bg-primary/10 border-gold'
                : isActiveRoute
                  ? 'text-primary-foreground bg-primary border-gold'
                  : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-gold/50'
            )}
            aria-label="Thông báo"
          >
            <Bell className={cn(
              "w-6 h-6 transition-all duration-300",
              open ? "text-primary fill-primary drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" : "",
              !isActiveRoute && !open && "group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]"
            )} />
            {unreadCount > 0 && (
              <span className={cn(
                "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold transition-all duration-300",
                hasNewNotification 
                  ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" 
                  : "bg-destructive text-destructive-foreground"
              )}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {isActiveRoute && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-gold to-primary rounded-t-full" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 sm:w-96 lg:w-[420px] p-0 border-border/50 shadow-xl rounded-xl overflow-hidden" 
          align="end"
          sideOffset={8}
        >
          <PopoverContentInner />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "h-11 w-11 relative transition-all duration-300 group flex items-center justify-center rounded-full",
            open 
              ? "text-primary bg-primary/10" 
              : "text-foreground hover:text-primary hover:bg-primary/10"
          )} 
          aria-label="Thông báo"
        >
          <Bell className={cn(
            "w-6 h-6 transition-all duration-300",
            open ? "text-primary fill-primary drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" : "",
            !open && "group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]"
          )} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold transition-all duration-300",
              hasNewNotification 
                ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" 
                : "bg-destructive text-destructive-foreground"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 lg:w-[420px] p-0 border-border/50 shadow-xl rounded-xl overflow-hidden" 
        align="end" 
        sideOffset={8}
      >
        <PopoverContentInner />
      </PopoverContent>
    </Popover>
  );
};
