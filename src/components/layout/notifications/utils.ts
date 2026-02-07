/**
 * Notification Utility Functions
 */

import { Bell, Heart, MessageCircle, Share2, Gift, Shield, UserPlus } from 'lucide-react';
import { differenceInHours, isToday, isYesterday, differenceInDays } from 'date-fns';
import type { NotificationWithDetails, NotificationGroups } from './types';
import { REACTION_ICONS } from './types';
import React from 'react';

/**
 * Group notifications by time periods
 */
export function groupNotificationsByTime(notifications: NotificationWithDetails[]): NotificationGroups {
  const now = new Date();
  
  const groups: NotificationGroups = {
    new: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  notifications.forEach(notification => {
    const createdAt = new Date(notification.created_at);
    const hoursAgo = differenceInHours(now, createdAt);
    const daysAgo = differenceInDays(now, createdAt);

    if (hoursAgo < 1) {
      groups.new.push(notification);
    } else if (isToday(createdAt)) {
      groups.today.push(notification);
    } else if (isYesterday(createdAt)) {
      groups.yesterday.push(notification);
    } else if (daysAgo <= 7) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

/**
 * Get notification icon element based on type
 */
export function getNotificationIcon(type: string): React.ReactNode {
  if (REACTION_ICONS[type]) {
    return React.createElement('span', { className: 'text-base' }, REACTION_ICONS[type].icon);
  }

  const iconProps = { className: 'w-4 h-4' };
  
  switch (type) {
    case 'comment':
    case 'comment_reply':
    case 'comment_like':
      return React.createElement(MessageCircle, { ...iconProps, className: 'w-4 h-4 text-primary' });
    case 'share':
      return React.createElement(Share2, { ...iconProps, className: 'w-4 h-4 text-green-500' });
    case 'reward_approved':
    case 'reward_rejected':
      return React.createElement(Gift, { ...iconProps, className: 'w-4 h-4 text-gold' });
    case 'account_banned':
      return React.createElement(Shield, { ...iconProps, className: 'w-4 h-4 text-destructive' });
    case 'friend_request':
    case 'friend_accepted':
      return React.createElement(UserPlus, { ...iconProps, className: 'w-4 h-4 text-pink-500' });
    default:
      return React.createElement(Bell, { ...iconProps, className: 'w-4 h-4 text-muted-foreground' });
  }
}

/**
 * Truncate content to specified length
 */
export function truncateContent(content: string | null | undefined, maxLength: number = 50): string {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

/**
 * Get notification text with optional post snippet
 */
export function getNotificationText(
  type: string, 
  username: string, 
  postContent?: string | null
): { main: React.ReactNode; snippet?: string } {
  const snippet = postContent ? truncateContent(postContent, 50) : undefined;
  
  const textMap: Record<string, React.ReactNode> = {
    like: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã thích bài viết của bạn'),
    love: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã yêu thích bài viết của bạn'),
    care: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã thương bài viết của bạn'),
    haha: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã cười với bài viết của bạn'),
    wow: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã ngạc nhiên với bài viết của bạn'),
    sad: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã buồn với bài viết của bạn'),
    angry: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã tức giận với bài viết của bạn'),
    pray: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã cầu nguyện cho bài viết của bạn'),
    comment: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã bình luận bài viết của bạn'),
    comment_reply: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã trả lời bình luận của bạn'),
    comment_like: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã thích bình luận của bạn'),
    share: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã chia sẻ bài viết của bạn'),
    reward_approved: React.createElement(React.Fragment, null, '🎉 ', React.createElement('strong', null, 'Chúc mừng!'), ' Phần thưởng của bạn đã được duyệt'),
    reward_rejected: React.createElement(React.Fragment, null, '📋 Yêu cầu nhận thưởng cần được xem xét lại'),
    account_banned: React.createElement(React.Fragment, null, '⚠️ Tài khoản của bạn đã bị hạn chế'),
    friend_request: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã gửi lời mời kết bạn'),
    friend_accepted: React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã chấp nhận lời mời kết bạn'),
  };

  return {
    main: textMap[type] || React.createElement(React.Fragment, null, React.createElement('strong', null, username), ' đã tương tác với bạn'),
    snippet,
  };
}

/**
 * Get section title for time group
 */
export function getSectionTitle(key: keyof NotificationGroups): string {
  const titles: Record<keyof NotificationGroups, string> = {
    new: 'Mới',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    earlier: 'Trước đó',
  };
  return titles[key];
}
