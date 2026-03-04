/**
 * Facebook-Style NotificationDropdown — Refactored to use useNotifications hook
 */

import { Bell, MoreHorizontal, Settings, Check, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobileOrTablet } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationSection } from './notifications/NotificationSection';
import { NotificationItem } from './notifications/NotificationItem';
import { FriendRequestItem } from './notifications/FriendRequestItem';

interface NotificationDropdownProps {
  centerNavStyle?: boolean;
  isActiveRoute?: boolean;
}

export const NotificationDropdown = ({ centerNavStyle = false, isActiveRoute = false }: NotificationDropdownProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobileOrTablet = useIsMobileOrTablet();

  const {
    notifications, unreadCount, hasNewNotification,
    activeTab, setActiveTab,
    isExpanded, setIsExpanded,
    friendRequests, fraudAlerts, groupedNotifications,
    markAllAsRead, handleNotificationClick,
    handleAcceptFriendRequest, handleRejectFriendRequest,
  } = useNotifications();

  const closePopover = useCallback(() => setOpen(false), []);

  const onNotificationClick = useCallback((n: Parameters<typeof handleNotificationClick>[0]) => {
    handleNotificationClick(n, closePopover);
  }, [handleNotificationClick, closePopover]);

  // Mobile: navigate to page
  if (isMobileOrTablet) {
    return (
      <button
        onClick={() => navigate('/notifications')}
        className="h-11 w-11 relative transition-all duration-300 group flex items-center justify-center rounded-full text-foreground hover:text-primary hover:bg-primary/10"
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
            hasNewNotification ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" : "bg-destructive text-destructive-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

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
              <Check className="w-4 h-4" /> Đánh dấu tất cả đã đọc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setOpen(false); navigate('/notifications'); }} className="gap-2">
              <Settings className="w-4 h-4" /> Cài đặt thông báo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-border/30">
        <button
          onClick={() => setActiveTab('all')}
          className={cn("rounded-full px-4 h-8 text-sm font-medium transition-colors",
            activeTab === 'all' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={cn("rounded-full px-4 h-8 text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === 'unread' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
        >
          Chưa đọc
          {unreadCount > 0 && (
            <span className={cn("text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center",
              activeTab === 'unread' ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <ScrollArea className={cn("transition-all duration-300", isExpanded ? "h-[70vh] sm:h-[75vh]" : "h-[400px] sm:h-[450px]")}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</p>
          </div>
        ) : (
          <div className="py-2">
            {fraudAlerts.length > 0 && (
              <div className="border-b-2 border-destructive/30 bg-destructive/5">
                <div className="px-4 py-2 flex items-center gap-2 bg-destructive/10 border-b border-destructive/20">
                  <Shield className="w-4 h-4 text-destructive" />
                  <span className="font-semibold text-sm text-destructive">🛡️ Cảnh báo bảo mật</span>
                </div>
                {fraudAlerts.slice(0, 5).map((n) => (
                  <NotificationItem key={n.id} notification={n} onClick={onNotificationClick} />
                ))}
              </div>
            )}

            {friendRequests.length > 0 && (
              <div className="border-b border-border/30 pb-2">
                <div className="flex justify-between items-center px-4 py-2">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> Lời mời kết bạn
                  </span>
                  <button onClick={() => navigate('/friends?tab=requests')} className="text-primary text-sm hover:underline">
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5">
                  {friendRequests.slice(0, 3).map((n) => (
                    <FriendRequestItem key={n.id} notification={n} onAccept={handleAcceptFriendRequest} onReject={handleRejectFriendRequest} onNavigate={onNotificationClick} />
                  ))}
                </div>
              </div>
            )}

            {(['new', 'today', 'yesterday', 'thisWeek', 'earlier'] as const).map((key) => (
              <NotificationSection
                key={key} sectionKey={key}
                notifications={groupedNotifications[key]}
                onNotificationClick={onNotificationClick}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRejectFriendRequest={handleRejectFriendRequest}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <div className="p-2 border-t border-border/30">
          <Button variant="ghost" className="w-full text-primary hover:text-primary/80 hover:bg-primary/5 font-medium"
            onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Thu gọn' : 'Xem tất cả thông báo'}
          </Button>
        </div>
      )}
    </>
  );

  const bellIcon = (isOpen: boolean, extraClass?: string) => (
    <Bell className={cn(
      "w-6 h-6 transition-all duration-300",
      isOpen ? "text-primary fill-primary drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" : "",
      extraClass
    )} />
  );

  const badge = (
    unreadCount > 0 ? (
      <span className={cn(
        "absolute -top-0.5 -right-0.5 text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold transition-all duration-300",
        hasNewNotification ? "bg-gold text-black shadow-[0_0_15px_hsl(var(--gold-glow))]" : "bg-destructive text-destructive-foreground"
      )}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    ) : null
  );

  if (centerNavStyle) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex-1 h-full max-w-[100px] flex items-center justify-center relative transition-all duration-300 rounded-full border-[0.5px] group",
              open ? 'text-primary bg-primary/10 border-gold'
                : isActiveRoute ? 'text-primary-foreground bg-primary border-gold'
                : 'text-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-gold/50'
            )}
            aria-label="Thông báo"
          >
            {bellIcon(open, !isActiveRoute && !open ? "group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" : undefined)}
            {badge}
            {isActiveRoute && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-gold to-primary rounded-t-full" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 sm:w-96 lg:w-[420px] p-0 border-border/50 shadow-xl rounded-xl overflow-hidden" align="end" sideOffset={8}>
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
            open ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-primary/10"
          )}
          aria-label="Thông báo"
        >
          {bellIcon(open, !open ? "group-hover:text-primary group-hover:drop-shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" : undefined)}
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 lg:w-[420px] p-0 border-border/50 shadow-xl rounded-xl overflow-hidden" align="end" sideOffset={8}>
        <PopoverContentInner />
      </PopoverContent>
    </Popover>
  );
};
