/**
 * NotificationItem - Single notification display component
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { NotificationWithDetails } from './types';
import { getNotificationIcon, getNotificationText } from './utils';

interface NotificationItemProps {
  notification: NotificationWithDetails;
  onClick: (notification: NotificationWithDetails) => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { main: notificationText, snippet } = getNotificationText(
    notification.type,
    notification.actor?.username || 'Người dùng',
    notification.post?.content
  );

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        "w-full p-3 sm:p-4 flex items-start gap-3 hover:bg-muted/50 transition-all duration-200 border-b border-border/30 text-left",
        !notification.read && "bg-gradient-to-r from-gold/10 via-gold/5 to-transparent shadow-[inset_0_0_20px_hsl(var(--gold-glow)/0.1)]"
      )}
    >
      {/* Avatar with icon badge */}
      <div className="relative flex-shrink-0">
        <Avatar className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 border-2 transition-all",
          !notification.read ? "border-gold/50 shadow-[0_0_10px_hsl(var(--gold-glow)/0.3)]" : "border-transparent"
        )}>
          {notification.actor?.avatar_url && (
            <AvatarImage src={notification.actor.avatar_url} />
          )}
          <AvatarFallback className="bg-primary/20 text-primary">
            {notification.actor?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-card rounded-full flex items-center justify-center border border-border shadow-sm">
          {getNotificationIcon(notification.type)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-relaxed",
          !notification.read ? "text-foreground" : "text-muted-foreground"
        )}>
          {notificationText}
        </p>
        
        {/* Post snippet */}
        {snippet && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
            "{snippet}"
          </p>
        )}
        
        <p className={cn(
          "text-xs mt-1",
          !notification.read ? "text-gold" : "text-muted-foreground"
        )}>
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: vi
          })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2.5 h-2.5 bg-gold rounded-full flex-shrink-0 mt-2 shadow-[0_0_8px_hsl(var(--gold-glow))] animate-pulse" />
      )}
    </button>
  );
}
