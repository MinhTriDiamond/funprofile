/**
 * Notification Utility Functions
 */

import { NotificationWithDetails, NotificationGroups, NotificationMetadata, REACTION_ICONS } from './types';
import { Bell, MessageCircle, Share2, Gift, Shield, UserPlus, UserCheck, UserX, Wallet, Radio, Sparkles } from 'lucide-react';
import React from 'react';

/**
 * Group notifications by time periods
 */
export const groupNotificationsByTime = (notifications: NotificationWithDetails[]): NotificationGroups => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const groups: NotificationGroups = {
    new: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: []
  };

  notifications.forEach(n => {
    const createdAt = new Date(n.created_at);

    if (createdAt >= hourAgo) {
      groups.new.push(n);
    } else if (createdAt >= today) {
      groups.today.push(n);
    } else if (createdAt >= yesterday) {
      groups.yesterday.push(n);
    } else if (createdAt >= weekAgo) {
      groups.thisWeek.push(n);
    } else {
      groups.earlier.push(n);
    }
  });

  return groups;
};

/**
 * Get notification icon element based on type
 */
export const getNotificationIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'like':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.like.icon);
    case 'love':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.love.icon);
    case 'care':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.care.icon);
    case 'haha':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.haha.icon);
    case 'wow':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.wow.icon);
    case 'sad':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.sad.icon);
    case 'angry':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.angry.icon);
    case 'pray':
      return React.createElement('span', { className: 'text-lg' }, REACTION_ICONS.pray.icon);
    case 'comment':
    case 'comment_like':
    case 'comment_reply':
      return React.createElement(MessageCircle, { className: 'w-4 h-4 text-primary' });
    case 'share':
      return React.createElement(Share2, { className: 'w-4 h-4 text-green-500' });
    case 'donation':
      return React.createElement(Gift, { className: 'w-4 h-4 text-green-500' });
    case 'reward_approved':
    case 'reward_rejected':
      return React.createElement(Gift, { className: 'w-4 h-4 text-gold' });
    case 'claim_reward':
      return React.createElement(Wallet, { className: 'w-4 h-4 text-gold' });
    case 'account_banned':
      return React.createElement(Shield, { className: 'w-4 h-4 text-destructive' });
    case 'admin_shared_device':
    case 'admin_email_farm':
    case 'admin_blacklisted_ip':
    case 'admin_fraud_daily':
      return React.createElement(Shield, { className: 'w-4 h-4 text-orange-500' });
    case 'reward_adjustment':
      return React.createElement(Wallet, { className: 'w-4 h-4 text-orange-500' });
    case 'live_started':
      return React.createElement(Radio, { className: 'w-4 h-4 text-destructive' });
    case 'friend_request':
      return React.createElement(UserPlus, { className: 'w-4 h-4 text-purple-500' });
    case 'friend_accepted':
      return React.createElement(UserCheck, { className: 'w-4 h-4 text-green-500' });
    case 'friend_removed':
      return React.createElement(UserX, { className: 'w-4 h-4 text-destructive' });
    default:
      return React.createElement(Bell, { className: 'w-4 h-4 text-muted-foreground' });
  }
};

/**
 * Truncate content to specified length
 */
export const truncateContent = (content: string | null | undefined, maxLength: number = 50): string => {
  if (!content) return '';
  return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
};

/**
 * Format usernames with emails from metadata: "user1 (email1), user2 (email2)"
 */
const formatUsernamesWithEmails = (
  usernames: string[] | undefined,
  emailsMap: Record<string, string> | undefined,
  limit: number = 5
): string => {
  if (!usernames?.length) return '';
  return usernames.slice(0, limit).map(name => {
    const email = emailsMap?.[name];
    return email ? `${name} (${email})` : name;
  }).join(', ');
};

/**
 * Get notification text with optional post snippet
 */
export const getNotificationText = (
  type: string, 
  username: string, 
  postContent?: string | null,
  metadata?: NotificationMetadata | null
): { main: React.ReactNode; snippet?: string } => {
  const snippet = postContent ? truncateContent(postContent, 50) : undefined;

  const createMainText = (action: string) => {
    return React.createElement(React.Fragment, null,
      React.createElement('strong', null, username),
      ` ${action}`
    );
  };

  let main: React.ReactNode;

  switch (type) {
    case 'like':
      main = createMainText('đã thích bài viết của bạn');
      break;
    case 'love':
      main = createMainText('đã yêu thích bài viết của bạn');
      break;
    case 'care':
      main = createMainText('đã thương thương bài viết của bạn');
      break;
    case 'haha':
      main = createMainText('đã cười với bài viết của bạn');
      break;
    case 'wow':
      main = createMainText('đã ngạc nhiên với bài viết của bạn');
      break;
    case 'sad':
      main = createMainText('đã buồn với bài viết của bạn');
      break;
    case 'angry':
      main = createMainText('đã tức giận với bài viết của bạn');
      break;
    case 'pray':
      main = createMainText('đã gửi lời biết ơn với bài viết của bạn');
      break;
    case 'comment':
      main = createMainText('đã bình luận bài viết của bạn');
      break;
    case 'comment_like':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã thích bình luận của bạn'
      );
      break;
    case 'comment_reply':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã trả lời bình luận của bạn'
      );
      break;
    case 'share':
      main = createMainText('đã chia sẻ bài viết của bạn');
      break;
    case 'donation':
      main = createMainText('đã tặng quà cho bạn');
      break;
    case 'reward_approved':
      main = React.createElement(React.Fragment, null,
        '🎉 ',
        React.createElement('strong', null, 'Chúc mừng!'),
        ' Phần thưởng của bạn đã được duyệt'
      );
      break;
    case 'reward_rejected':
      main = React.createElement(React.Fragment, null,
        '📋 Yêu cầu nhận thưởng cần được xem xét lại'
      );
      break;
    case 'account_banned':
      main = React.createElement(React.Fragment, null,
        '⚠️ Tài khoản của bạn đã bị hạn chế'
      );
      break;
    case 'admin_shared_device': {
      const m = metadata;
      const detail = m?.device_hash
        ? ` Thiết bị ${m.device_hash.slice(0, 8)}... có ${m.user_count || '?'} TK`
        : ' Phát hiện thiết bị dùng chung nhiều tài khoản';
      main = React.createElement(React.Fragment, null,
        '🔴 ',
        React.createElement('strong', null, 'Cảnh báo:'),
        detail
      );
      break;
    }
    case 'admin_email_farm': {
      const m = metadata;
      const detail = m?.email_base
        ? ` Cụm email "${m.email_base}" có ${m.count || '?'} TK`
        : ' Phát hiện cụm email farm nghi ngờ';
      main = React.createElement(React.Fragment, null,
        '🔴 ',
        React.createElement('strong', null, 'Cảnh báo:'),
        detail
      );
      break;
    }
    case 'admin_blacklisted_ip': {
      const m = metadata;
      const detail = m?.ip_address
        ? ` Đăng nhập từ IP bị chặn ${m.ip_address}`
        : ' Đăng nhập từ IP bị chặn';
      main = React.createElement(React.Fragment, null,
        '🔴 ',
        React.createElement('strong', null, 'Cảnh báo:'),
        detail
      );
      break;
    }
    case 'admin_fraud_daily': {
      const m = metadata;
      const summary = m?.alerts_count
        ? ` ${m.alerts_count} cảnh báo${m?.accounts_held ? `, ${m.accounts_held} TK đình chỉ` : ''}`
        : ' Có hoạt động đáng ngờ cần xử lý';
      main = React.createElement(React.Fragment, null,
        '📊 ',
        React.createElement('strong', null, 'Báo cáo gian lận:'),
        summary
      );
      break;
    }
    case 'claim_reward':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, 'FUN Profile Treasury'),
        ' đã chuyển phần thưởng CAMLY về ví của bạn'
      );
      break;
    case 'reward_adjustment': {
      const adjustMsg = metadata?.message || 'Số dư CAMLY của bạn đã được điều chỉnh';
      main = React.createElement(React.Fragment, null,
        '⚖️ ',
        React.createElement('strong', null, 'Điều chỉnh CAMLY: '),
        adjustMsg
      );
      break;
    }
    case 'friend_request':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã gửi cho bạn lời mời kết bạn'
      );
      break;
    case 'friend_accepted':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã chấp nhận lời mời kết bạn của bạn'
      );
      break;
    case 'friend_removed':
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã hủy kết bạn với bạn'
      );
      break;
    case 'live_started':
      main = React.createElement(React.Fragment, null,
        '🔴 ',
        React.createElement('strong', null, username),
        ' đang phát trực tiếp'
      );
      break;
    default:
      main = React.createElement(React.Fragment, null,
        React.createElement('strong', null, username),
        ' đã tương tác với bạn'
      );
  }

  return { main, snippet };
};

/**
 * Get section title for time group
 */
export const getSectionTitle = (key: keyof NotificationGroups): string => {
  const titles: Record<keyof NotificationGroups, string> = {
    new: 'Mới',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    earlier: 'Trước đó',
  };
  return titles[key];
};
