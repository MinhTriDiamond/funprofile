/**
 * Facebook-style Notification Types
 */

export interface NotificationActor {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name?: string | null;
}

export interface NotificationPost {
  id: string;
  content: string;
}

export interface NotificationMetadata {
  device_hash?: string;
  user_count?: number;
  usernames?: string[];
  email_base?: string;
  count?: number;
  emails?: string[];
  ip_address?: string;
  alerts_count?: number;
  alerts?: string[];
  reason?: string;
  known_usernames?: string[];
}

export interface NotificationWithDetails {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: NotificationActor;
  post?: NotificationPost | null;
  metadata?: NotificationMetadata | null;
}

export interface NotificationGroups {
  new: NotificationWithDetails[];      // Trong 1 giờ qua
  today: NotificationWithDetails[];    // Hôm nay
  yesterday: NotificationWithDetails[]; // Hôm qua
  thisWeek: NotificationWithDetails[]; // Tuần này
  earlier: NotificationWithDetails[];  // Trước đó
}

export type FilterTab = 'all' | 'unread';

export const REACTION_ICONS: Record<string, { icon: string; color: string }> = {
  like: { icon: '👍', color: 'text-blue-500' },
  love: { icon: '❤️', color: 'text-red-500' },
  care: { icon: '🥰', color: 'text-orange-500' },
  haha: { icon: '😂', color: 'text-yellow-500' },
  wow: { icon: '😮', color: 'text-yellow-500' },
  sad: { icon: '😢', color: 'text-yellow-500' },
  angry: { icon: '😠', color: 'text-orange-500' },
  pray: { icon: '🙏', color: 'text-purple-500' },
};

export const FRIEND_REQUEST_TYPES = ['friend_request', 'friend_removed'] as const;
export const REACTION_TYPES = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'pray', 'comment_like'] as const;
