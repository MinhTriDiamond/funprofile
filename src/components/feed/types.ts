export interface PostMetadata {
  live_status?: 'live' | 'ended' | string;
  live_session_id?: string;
  thumbnail_url?: string;
  recording_failed?: boolean;
  [key: string]: unknown;
}

export interface PostData {
  id: string;
  slug?: string | null;
  content: string;
  image_url: string | null;
  video_url?: string | null;
  media_urls?: Array<{ url: string; type: 'image' | 'video' }> | null;
  created_at: string;
  user_id: string;
  visibility?: string;
  post_type?: string;
  metadata?: PostMetadata | null;
  profiles: {
    username: string;
    display_name?: string | null;
    avatar_url: string | null;
    public_wallet_address?: string | null;
  };
}

export interface PostStats {
  reactions: { id: string; user_id: string; type: string }[];
  commentCount: number;
  shareCount: number;
}

export interface ReactionCount {
  type: string;
  count: number;
}

export interface FacebookPostCardProps {
  post: PostData;
  currentUserId: string;
  onPostDeleted: () => void;
  initialStats?: PostStats;
  isPinned?: boolean;
  onPinPost?: (postId: string) => void;
  onUnpinPost?: () => void;
  isOwnProfile?: boolean;
  viewAsPublic?: boolean;
}
