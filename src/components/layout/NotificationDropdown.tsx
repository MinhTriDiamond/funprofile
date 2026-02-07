/**
 * Facebook-Style NotificationDropdown
 * Features: Time grouping, post snippets, friend request inline actions, tabs filter, expand/collapse
 */

import { Bell, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import { toast } from 'sonner';

import {
  NotificationSection,
  groupNotificationsByTime,
  type NotificationWithDetails,
  type FilterTab,
  type NotificationGroups,
} from './notifications';

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
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const isMobileOrTablet = useIsMobileOrTablet();

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    // Fetch notifications with post content for snippets
    const { data } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        post_id,
        actor:actor_id (
          id,
          username,
          avatar_url,
          full_name
        ),
        post:post_id (
          id,
          content
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const typedData = data as unknown as NotificationWithDetails[];
      setNotifications(typedData);
      const newUnreadCount = typedData.filter(n => !n.read).length;
      
      if (newUnreadCount > unreadCount) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
      }
      
      setUnreadCount(newUnreadCount);
    }
  }, [unreadCount]);

  useEffect(() => {
    fetchNotifications();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [fetchNotifications]);

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
    
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate(`/profile/${notification.actor?.id}`);
    } else if (notification.type === 'reward_approved' || notification.type === 'reward_rejected') {
      navigate('/wallet');
    }
  };

  const handleAcceptFriendRequest = async (notification: NotificationWithDetails) => {
    if (!currentUserId || !notification.actor?.id) return;

    try {
      // Update friendship status
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('user_id', notification.actor.id)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending');

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);
      
      toast.success(`Đã chấp nhận lời mời kết bạn từ ${notification.actor.username}`);
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Không thể chấp nhận lời mời kết bạn');
    }
  };

  const handleRejectFriendRequest = async (notification: NotificationWithDetails) => {
    if (!currentUserId || !notification.actor?.id) return;

    try {
      // Delete friendship request
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', notification.actor.id)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending');

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notification.id);
      
      toast.success('Đã xóa lời mời kết bạn');
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Không thể xóa lời mời kết bạn');
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = filterTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  // Group notifications by time
  const groupedNotifications = groupNotificationsByTime(filteredNotifications);

  // Limit display unless expanded
  const getDisplayGroups = (): NotificationGroups => {
    if (isExpanded) return groupedNotifications;
    
    // Show limited items when not expanded
    const limitPerGroup = 3;
    return {
      new: groupedNotifications.new.slice(0, limitPerGroup),
      today: groupedNotifications.today.slice(0, limitPerGroup),
      yesterday: groupedNotifications.yesterday.slice(0, limitPerGroup),
      thisWeek: groupedNotifications.thisWeek.slice(0, limitPerGroup),
      earlier: groupedNotifications.earlier.slice(0, limitPerGroup),
    };
  };

  const displayGroups = getDisplayGroups();
  const hasMoreNotifications = 
    groupedNotifications.new.length > 3 ||
    groupedNotifications.today.length > 3 ||
    groupedNotifications.yesterday.length > 3 ||
    groupedNotifications.thisWeek.length > 3 ||
    groupedNotifications.earlier.length > 3;

  // Mobile/Tablet: Navigate directly to notifications page
  const handleBellClick = () => {
    if (isMobileOrTablet) {
      navigate('/notifications');
    }
  };

  // Render content for popover
  const renderPopoverContent = () => (
    <PopoverContent 
      className="w-80 sm:w-96 lg:w-[450px] p-0 border-gold/20 shadow-[0_0_20px_hsl(var(--gold-glow)/0.2)] bg-background" 
      align="end"
      sideOffset={8}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-gold/5 to-transparent">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-gold" />
          Thông báo
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-gold hover:text-gold/80 hover:underline transition-colors"
            >
              Đọc tất cả
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              <DropdownMenuItem onClick={() => navigate('/notifications')}>
                Xem tất cả thông báo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={markAllAsRead}>
                Đánh dấu tất cả đã đọc
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-border/30">
        <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="all" className="text-xs px-3">
              Tất cả
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs px-3">
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px] sm:h-[450px]">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{filterTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</p>
          </div>
        ) : (
          <>
            {/* Grouped sections */}
            {(['new', 'today', 'yesterday', 'thisWeek', 'earlier'] as const).map((key) => (
              <NotificationSection
                key={key}
                sectionKey={key}
                notifications={displayGroups[key]}
                onNotificationClick={handleNotificationClick}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRejectFriendRequest={handleRejectFriendRequest}
              />
            ))}

            {/* Expand/Collapse button */}
            {hasMoreNotifications && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-muted/50 transition-colors border-t border-border/30"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Xem thêm
                  </>
                )}
              </button>
            )}
          </>
        )}
      </ScrollArea>
    </PopoverContent>
  );

  // Mobile/Tablet: Simple button
  if (isMobileOrTablet) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleBellClick}
        className={cn(
          "h-10 w-10 relative transition-all duration-300 group",
          "text-foreground hover:text-primary hover:bg-primary/10",
          hasNewNotification && "animate-pulse"
        )} 
        aria-label="Thông báo"
      >
        <Bell className={cn(
          "w-5 h-5 transition-all duration-300",
          "group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]",
          hasNewNotification && "animate-bounce drop-shadow-[0_0_8px_hsl(48_96%_53%/0.6)]"
        )} />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-bold transition-all duration-300",
            hasNewNotification 
              ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))] animate-pulse scale-110" 
              : "bg-primary text-primary-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  // Desktop: Center nav style
  if (centerNavStyle) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-lg group",
              isActiveRoute
                ? 'text-primary-foreground bg-primary'
                : 'text-foreground hover:text-primary hover:bg-primary/10'
            )}
            aria-label="Thông báo"
          >
            <Bell className={cn(
              "w-6 h-6 transition-all duration-300",
              !isActiveRoute && "group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]"
            )} />
            {unreadCount > 0 && (
              <span className={cn(
                "absolute top-1 right-2 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold transition-all duration-300",
                hasNewNotification 
                  ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))] animate-pulse scale-110" 
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
        {renderPopoverContent()}
      </Popover>
    );
  }

  // Desktop: Default style
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-14 w-14 relative transition-all duration-300 group",
            "text-foreground hover:text-primary hover:bg-primary/10",
            hasNewNotification && "animate-pulse"
          )} 
          aria-label="Thông báo"
        >
          <Bell className={cn(
            "w-7 h-7 transition-all duration-300",
            "group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]",
            hasNewNotification && "animate-bounce"
          )} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold transition-all duration-300",
              hasNewNotification 
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(142_76%_36%/0.5)] animate-pulse scale-110" 
                : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      {renderPopoverContent()}
    </Popover>
  );
};
