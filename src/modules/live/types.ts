export type LivePrivacy = 'public' | 'friends';
export type LiveStatus = 'live' | 'ended';

export interface LiveHostProfile {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface LiveSession {
  id: string;
  host_user_id: string;
  agora_channel?: string | null;
  channel_name: string;
  agora_uid_host?: number | null;
  recording_uid?: number | null;
  recording_status?:
    | 'idle'
    | 'acquired'
    | 'acquiring'
    | 'starting'
    | 'recording'
    | 'stopping'
    | 'processing'
    | 'ready'
    | 'stopped'
    | 'failed'
    | null;
  title: string | null;
  privacy: LivePrivacy;
  status: LiveStatus;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  post_id: string | null;
  host_profile?: LiveHostProfile | null;
}

export interface CreateLiveSessionInput {
  title?: string;
  privacy: LivePrivacy;
}
