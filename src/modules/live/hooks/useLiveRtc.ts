import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { createAgoraRtcClient, secondsUntilExpiry } from '@/lib/agoraRtc';
import { getRtcToken } from '../api/agora';

type LiveRole = 'host' | 'audience';

interface UseLiveRtcOptions {
  sessionId?: string;
  role: LiveRole;
  enabled?: boolean;
  onViewerCountChange?: (count: number) => void;
  onRemoteOffline?: () => void;
}

const MAX_REJOIN_ATTEMPTS = 5;

function mapRtcError(error: unknown): string {
  const anyErr = error as any;
  const name = String(anyErr?.name || '');
  const msg = String(anyErr?.message || '');
  if (name === 'NotAllowedError') return 'Bạn chưa cấp quyền camera/micro.';
  if (name === 'NotFoundError') return 'Không tìm thấy thiết bị camera/micro.';
  if (msg.toLowerCase().includes('network')) return 'Mạng không ổn định, đang thử kết nối lại...';
  if (msg.toLowerCase().includes('timeout')) return 'Kết nối quá chậm, vui lòng thử lại.';
  return msg || 'Kết nối LIVE thất bại.';
}

export function useLiveRtc({
  sessionId,
  role,
  enabled = true,
  onViewerCountChange,
  onRemoteOffline,
}: UseLiveRtcOptions) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const remoteAudioRef = useRef<any>(null);
  const tokenExpiresAtRef = useRef<number | null>(null);
  const rejoinAttemptsRef = useRef(0);
  const renewFailuresRef = useRef(0);
  const rejoinTimerRef = useRef<number | null>(null);
  const isLeavingRef = useRef(false);
  const startedRef = useRef(false);

  const localContainerRef = useRef<HTMLDivElement | null>(null);
  const [localContainerMounted, setLocalContainerMounted] = useState(false);

  const setLocalContainerRef = useCallback((node: HTMLDivElement | null) => {
    localContainerRef.current = node;
    setLocalContainerMounted(!!node);
  }, []);
  const remoteContainerRef = useRef<HTMLDivElement | null>(null);

  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');

  const emitViewerCount = useCallback((_client: IAgoraRTCClient) => {
    // no-op: viewer count managed by increment/decrement in LiveAudiencePage
  }, []);

  const clearRejoinTimer = () => {
    if (rejoinTimerRef.current) {
      window.clearTimeout(rejoinTimerRef.current);
      rejoinTimerRef.current = null;
    }
  };

  const playRemote = useCallback((user: IAgoraRTCRemoteUser) => {
    if (user.videoTrack && remoteContainerRef.current) {
      user.videoTrack.play(remoteContainerRef.current);
      setHasRemoteVideo(true);
    }
    if (user.audioTrack) {
      remoteAudioRef.current = user.audioTrack;
      user.audioTrack.play();
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (!sessionId || !clientRef.current) return;
    const tokenData = await getRtcToken({ sessionId, role });
    tokenExpiresAtRef.current = tokenData.expiresAt;
    await clientRef.current.renewToken(tokenData.token);
    renewFailuresRef.current = 0;
  }, [role, sessionId]);

  const leave = useCallback(async () => {
    isLeavingRef.current = true;
    clearRejoinTimer();
    renewFailuresRef.current = 0;
    rejoinAttemptsRef.current = 0;

    localAudioRef.current?.close();
    localVideoRef.current?.close();
    localAudioRef.current = null;
    localVideoRef.current = null;
    remoteAudioRef.current?.stop?.();
    remoteAudioRef.current = null;
    setHasRemoteVideo(false);
    setIsJoined(false);
    startedRef.current = false;

    if (clientRef.current) {
      clientRef.current.removeAllListeners();
      await clientRef.current.leave();
      clientRef.current = null;
    }
  }, []);

  const rejoinWithBackoff = useCallback(async () => {
    if (!sessionId || !clientRef.current || isLeavingRef.current) return;
    if (rejoinAttemptsRef.current >= MAX_REJOIN_ATTEMPTS) {
      setStatusText('Kết nối thất bại, thử tải lại.');
      return;
    }

    rejoinAttemptsRef.current += 1;
    const attempt = rejoinAttemptsRef.current;
    const delay = Math.min(1000 * 2 ** (attempt - 1), 12000);
    clearRejoinTimer();

    rejoinTimerRef.current = window.setTimeout(async () => {
      try {
        const tokenData = await getRtcToken({ sessionId, role });
        tokenExpiresAtRef.current = tokenData.expiresAt;
        await clientRef.current?.leave();
        await clientRef.current?.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid);

        if (role === 'host' && localAudioRef.current) {
          if (localVideoRef.current) {
            await clientRef.current?.publish([localAudioRef.current, localVideoRef.current]);
          } else {
            await clientRef.current?.publish(localAudioRef.current);
          }
          if (clientRef.current) emitViewerCount(clientRef.current);
        }

        rejoinAttemptsRef.current = 0;
        setStatusText(role === 'audience' ? 'Waiting for host...' : 'LIVE');
        setIsJoined(true);
      } catch (error) {
        setStatusText(mapRtcError(error));
        rejoinWithBackoff().catch(() => undefined);
      }
    }, delay);
  }, [emitViewerCount, role, sessionId]);

  const setupClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = createAgoraRtcClient('live');
    clientRef.current = client;

    client.on('user-joined', () => {
      emitViewerCount(client);
    });

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      playRemote(user);
      emitViewerCount(client);
    });

    client.on('user-unpublished', () => {
      setHasRemoteVideo(false);
      if (role === 'audience') {
        setStatusText('Host tạm dừng phát...');
        onRemoteOffline?.();
      }
    });

    client.on('user-left', () => {
      emitViewerCount(client);
      if (role === 'audience') {
        setHasRemoteVideo(false);
        setStatusText('Host đã rời phiên live');
        onRemoteOffline?.();
      }
    });

    client.on('connection-state-change', (curState, _prevState, reason) => {
      if (curState === 'DISCONNECTED' && reason !== 'LEAVE' && !isLeavingRef.current) {
        setStatusText('Mạng không ổn định, đang thử kết nối lại...');
        rejoinWithBackoff().catch(() => undefined);
      }
    });

    client.on('token-privilege-will-expire', () => {
      refreshToken().catch(() => {
        renewFailuresRef.current += 1;
        if (renewFailuresRef.current >= 2) {
          setStatusText('Đang cấp lại token...');
          rejoinWithBackoff().catch(() => undefined);
        }
      });
    });

    client.on('token-privilege-did-expire', () => {
      refreshToken().catch(() => {
        renewFailuresRef.current += 1;
        setStatusText('Token hết hạn, đang kết nối lại...');
        rejoinWithBackoff().catch(() => undefined);
      });
    });

    return client;
  }, [emitViewerCount, onRemoteOffline, playRemote, refreshToken, rejoinWithBackoff, role]);

  const start = useCallback(async () => {
    if (!sessionId || !enabled) return;
    if (startedRef.current) return;
    startedRef.current = true;
    isLeavingRef.current = false;
    setStatusText('Connecting...');

    try {
      const tokenData = await getRtcToken({ sessionId, role });
      tokenExpiresAtRef.current = tokenData.expiresAt;
      const client = setupClient();
      await client.setClientRole(role);
      await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid);
      emitViewerCount(client);

      if (role === 'host') {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioRef.current = audioTrack;
        localVideoRef.current = videoTrack;
        if (localContainerRef.current) {
          videoTrack.play(localContainerRef.current);
        }
        await client.publish([audioTrack, videoTrack]);
        setStatusText('LIVE');
      } else {
        setStatusText('Waiting for host...');
        for (const user of client.remoteUsers) {
          if (user.hasVideo) await client.subscribe(user, 'video');
          if (user.hasAudio) await client.subscribe(user, 'audio');
          playRemote(user);
        }
      }

      setIsJoined(true);
      rejoinAttemptsRef.current = 0;
      renewFailuresRef.current = 0;
    } catch (error) {
      startedRef.current = false;
      setStatusText(mapRtcError(error));
      throw error;
    }
  }, [emitViewerCount, enabled, playRemote, role, sessionId, setupClient]);

  const toggleMute = useCallback(async () => {
    if (!localAudioRef.current) return;
    const next = !isMuted;
    await localAudioRef.current.setEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    if (!localVideoRef.current) return;
    const next = !isCameraOff;
    await localVideoRef.current.setEnabled(!next);
    setIsCameraOff(next);
  }, [isCameraOff]);

  const toggleRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) return;
    if (isMuted) {
      remoteAudioRef.current.play();
      setIsMuted(false);
    } else {
      remoteAudioRef.current.stop();
      setIsMuted(true);
    }
  }, [isMuted]);

  useEffect(() => {
    if (!tokenExpiresAtRef.current || !isJoined) return;
    const secondsLeft = secondsUntilExpiry(tokenExpiresAtRef.current);
    if (secondsLeft > 90) return;
    refreshToken().catch(() => {
      rejoinWithBackoff().catch(() => undefined);
    });
  }, [isJoined, refreshToken, rejoinWithBackoff]);

  useEffect(() => {
    if (localContainerMounted && localVideoRef.current && localContainerRef.current) {
      localVideoRef.current.play(localContainerRef.current);
    }
  }, [localContainerMounted]);

  useEffect(() => {
    return () => {
      leave().catch(() => undefined);
    };
  }, [leave]);

  const getLocalTracks = useCallback(() => ({
    audio: localAudioRef.current,
    video: localVideoRef.current,
  }), []);

  return {
    setLocalContainerRef,
    remoteContainerRef,
    isJoined,
    isMuted,
    isCameraOff,
    hasRemoteVideo,
    statusText,
    start,
    leave,
    toggleMute,
    toggleCamera,
    toggleRemoteAudio,
    getLocalTracks,
  };
}
