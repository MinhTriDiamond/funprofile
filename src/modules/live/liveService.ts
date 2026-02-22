import { supabase } from '@/integrations/supabase/client';
import { uploadToR2 } from '@/utils/r2Upload';
import type { CreateLiveSessionInput, LiveSession } from './types';

const db = supabase as any;

const LIVE_POST_DEFAULT_CONTENT = 'Dang LIVE tren FUN Profile';

const buildChannelName = (userId: string) => `live_${userId}_${Date.now()}`;

const uuidToNumericUid = (uuid: string) => {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash) || 10001;
};

interface UploadLiveRecordingResult {
  key: string;
  url: string;
}

export type RecordingStatus =
  | 'idle'
  | 'acquiring'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'stopped';

export interface FinalizeLiveSessionOptions {
  playbackUrl?: string | null;
  recordingStatus?: RecordingStatus;
}

type LivePostMetadata = {
  live_title?: string | null;
  live_status?: 'live' | 'ended';
  channel_name?: string | null;
  agora_channel?: string | null;
  live_session_id?: string | null;
  viewer_count?: number;
  ended_at?: string | null;
  playback_url?: string | null;
  [key: string]: unknown;
};
async function mergeLivePostMetadata(postId: string, patch: Partial<LivePostMetadata>): Promise<void> {
  const { data: existingPost } = await db
    .from('posts')
    .select('metadata')
    .eq('id', postId)
    .maybeSingle();

  const existing = (existingPost?.metadata || {}) as LivePostMetadata;

  await db
    .from('posts')
    .update({
      metadata: {
        ...existing,
        ...patch,
      },
    })
    .eq('id', postId);
}

function normalizeLiveSession(row: any): LiveSession {
  return {
    id: row.id,
    host_user_id: row.host_user_id || row.owner_id,
    agora_channel: row.agora_channel || row.channel_name,
    channel_name: row.channel_name,
    agora_uid_host: row.agora_uid_host ?? null,
    recording_uid: row.recording_uid ?? null,
    recording_status: row.recording_status ?? null,
    title: row.title ?? null,
    privacy: row.privacy,
    status: row.status,
    viewer_count: row.viewer_count ?? 0,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    post_id: row.post_id ?? null,
    host_profile: row.host_profile
      ? {
          username: row.host_profile.username ?? null,
          full_name: row.host_profile.full_name ?? null,
          avatar_url: row.host_profile.avatar_url ?? null,
        }
      : null,
  };
}

export async function uploadLiveThumbnail(
  thumbnailBlob: Blob,
  liveSessionId: string
): Promise<string | null> {
  try {
    const path = `live/${liveSessionId}/thumbnail.jpg`;
    const { error } = await supabase.storage
      .from('live-thumbnails')
      .upload(path, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (error) {
      console.warn('[liveService] uploadLiveThumbnail error:', error);
      return null;
    }
    const { data } = supabase.storage.from('live-thumbnails').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('[liveService] uploadLiveThumbnail exception:', err);
    return null;
  }
}

export async function attachLiveReplayToPost(
  sessionId: string,
  playbackUrl: string,
  durationSeconds?: number,
  thumbnailUrl?: string | null
): Promise<void> {
  const { error } = await db.rpc('attach_live_replay_to_post', {
    _session_id: sessionId,
    _playback_url: playbackUrl,
    _duration_seconds: durationSeconds,
    _thumbnail_url: thumbnailUrl,
  });
  if (error) throw error;
}

export async function createLiveSession(input: CreateLiveSessionInput): Promise<LiveSession> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Ban can dang nhap de bat dau live');
  }

  const userId = session.user.id;
  const hostUid = uuidToNumericUid(userId);
  const title = input.title?.trim() || '';
  const channelName = buildChannelName(userId);
  const visibility = input.privacy === 'friends' ? 'friends' : 'public';

  let postId: string | null = null;

  try {
    const { data: post, error: postError } = await db
      .from('posts')
      .insert({
        user_id: userId,
        content: title || LIVE_POST_DEFAULT_CONTENT,
        visibility,
        post_type: 'live',
        metadata: {
          live_title: title,
          live_status: 'live',
          channel_name: channelName,
          agora_channel: channelName,
          viewer_count: 0,
        },
      })
      .select('id')
      .single();

    if (postError) throw postError;
    postId = post.id;

    const { data, error } = await db
      .from('live_sessions')
      .insert({
        host_user_id: userId,
        owner_id: userId,
        channel_name: channelName,
        agora_channel: channelName,
        agora_uid_host: hostUid,
        title,
        privacy: input.privacy,
        status: 'live',
        recording_status: 'idle',
        post_id: postId,
      })
      .select(
        `
        id, host_user_id, agora_channel, channel_name, title, privacy, status, viewer_count,
        started_at, ended_at, created_at, updated_at, post_id,
        host_profile:profiles!live_sessions_host_user_id_fkey(username, full_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    await db
      .from('posts')
      .update({
        metadata: {
          live_title: title,
          live_status: 'live',
          channel_name: channelName,
          agora_channel: channelName,
          live_session_id: data.id,
          viewer_count: 0,
        },
      })
      .eq('id', postId);

    return normalizeLiveSession(data);
  } catch (error) {
    if (postId) {
      await db.from('posts').delete().eq('id', postId);
    }
    throw error;
  }
}

export async function getLiveSession(sessionId: string): Promise<LiveSession | null> {
  const { data, error } = await db
    .from('live_sessions')
    .select(
      `
      id, host_user_id, agora_channel, channel_name, recording_uid, title, privacy, status, viewer_count,
      started_at, ended_at, created_at, updated_at, post_id,
      host_profile:profiles!live_sessions_host_user_id_fkey(username, full_name, avatar_url)
    `
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeLiveSession(data);
}

export async function listActiveLiveSessions(): Promise<LiveSession[]> {
  const { data, error } = await db
    .from('live_sessions')
    .select(
      `
      id, host_user_id, agora_channel, channel_name, title, privacy, status, viewer_count,
      started_at, ended_at, created_at, updated_at, post_id,
      host_profile:profiles!live_sessions_host_user_id_fkey(username, full_name, avatar_url)
    `
    )
    .eq('status', 'live')
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeLiveSession);
}

export async function endLiveSession(sessionId: string): Promise<void> {
  await finalizeLiveSession(sessionId, { recordingStatus: 'failed' });
}

export async function finalizeLiveSession(
  sessionId: string,
  options: FinalizeLiveSessionOptions = {}
): Promise<void> {
  const { playbackUrl = null, recordingStatus = playbackUrl ? 'ready' : 'failed' } = options;
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from('live_sessions')
    .update({
      status: 'ended',
      ended_at: nowIso,
      recording_status: recordingStatus,
      updated_at: nowIso,
    })
    .eq('id', sessionId)
    .select('id, post_id, title, agora_channel, channel_name, ended_at')
    .single();

  if (error) throw error;

  if (data?.post_id) {
    await mergeLivePostMetadata(data.post_id, {
      live_status: 'ended',
      ended_at: data.ended_at,
      playback_url: playbackUrl,
    });

    if (playbackUrl) {
      await db.from('posts')
        .update({ video_url: playbackUrl })
        .eq('id', data.post_id);
    }
  }
}

export async function updateLiveViewerCount(sessionId: string, viewerCount: number): Promise<void> {
  const nextCount = Math.max(0, viewerCount);
  const { data } = await db
    .from('live_sessions')
    .update({ viewer_count: nextCount })
    .eq('id', sessionId)
    .select('id, post_id, title, agora_channel, channel_name')
    .maybeSingle();

  if (data?.post_id) {
    await db
      .from('posts')
      .update({
        metadata: {
          live_title: data.title,
          channel_name: data.agora_channel || data.channel_name,
          agora_channel: data.agora_channel || data.channel_name,
          live_status: 'live',
          viewer_count: nextCount,
          live_session_id: data.id,
        },
      })
      .eq('id', data.post_id);
  }
}

export async function incrementLiveViewerCount(sessionId: string): Promise<void> {
  await db.rpc('increment_live_viewer_count', { session_id: sessionId });
}

export async function decrementLiveViewerCount(sessionId: string): Promise<void> {
  await db.rpc('decrement_live_viewer_count', { session_id: sessionId });
}

export async function uploadLiveRecording(
  blob: Blob,
  liveSessionId: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<UploadLiveRecordingResult> {
  const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
  const customPath = `live/${liveSessionId}/recording-${Date.now()}.${extension}`;

  onProgress?.(10);

  // Convert Blob to File for uploadToR2
  const file = new File([blob], `recording.${extension}`, { type: mimeType });

  onProgress?.(30);

  const result = await uploadToR2(file, 'videos', customPath);

  onProgress?.(100);

  return { key: result.key, url: result.url };
}

export async function saveLiveReplay(liveSessionId: string, playbackUrl?: string | null): Promise<void> {
  await finalizeLiveSession(liveSessionId, {
    playbackUrl: playbackUrl || null,
    recordingStatus: playbackUrl ? 'ready' : 'failed',
  });
}
