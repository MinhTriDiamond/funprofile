import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Clock, Eye, Home, Loader2, Mic, MicOff, PhoneOff, Radio, RefreshCw, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';
import { usePplpEvaluate } from '@/hooks/usePplpEvaluate';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

import { supabase } from '@/integrations/supabase/client';
import {
  createLiveSession,
  finalizeLiveSession,
  updateLiveViewerCount,
  uploadLiveRecording,
  uploadLiveThumbnail,
  attachLiveReplayToPost,
  createChunkedRecording,
  type RecordingStatus,
} from '../liveService';
import { createRecorder, type RecorderController } from '../recording/clientRecorder';
import { useLiveRecording, type RecordingPhase } from '@/hooks/live/useLiveRecording';
import { useLiveSession } from '../useLiveSession';
import { useLiveRtc } from '../hooks/useLiveRtc';
import { useLiveHeartbeat } from '../hooks/useLiveHeartbeat';
import { LiveChatPanel } from '../components/LiveChatPanel';
import { FloatingReactions } from '../components/FloatingReactions';
import { useLiveDuration } from '../hooks/useLiveDuration';
import { useLivePresence } from '../hooks/useLivePresence';

type BootState = 'idle' | 'auth' | 'creating' | 'loading' | 'starting' | 'ready' | 'error';

const CHUNKED_RECORDING_ENABLED = true;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function toUserError(error: unknown): string {
  const anyErr = error as any;
  const message = String(anyErr?.message || '');
  const name = String(anyErr?.name || '');
  if (name === 'NotAllowedError') return 'Bạn chưa cấp quyền camera/micro.';
  if (name === 'NotFoundError') return 'Không tìm thấy thiết bị camera/micro.';
  if (message.toLowerCase().includes('timeout')) return 'Kết nối quá chậm, vui lòng thử lại.';
  return message || 'Không thể bắt đầu phát trực tiếp.';
}

/** Map recording phase to UI status */
function phaseToRecordingStatus(phase: RecordingPhase): RecordingStatus {
  const map: Record<RecordingPhase, RecordingStatus> = {
    idle: 'idle',
    recording: 'recording',
    stopping: 'stopping',
    uploading: 'processing',
    done: 'ready',
    error: 'failed',
  };
  return map[phase] ?? 'idle';
}

const REC_BADGE: Record<RecordingStatus, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  idle: { label: '⏸ Sẵn sàng', variant: 'secondary' },
  acquiring: { label: '⏳ Đang chuẩn bị...', variant: 'secondary' },
  starting: { label: '⏳ Đang bắt đầu...', variant: 'secondary' },
  recording: { label: '⏺ Đang ghi', variant: 'destructive' },
  stopping: { label: '⏳ Đang dừng...', variant: 'secondary' },
  compressing: { label: '🗜 Đang nén...', variant: 'secondary' },
  processing: { label: '⏳ Đang tải lên...', variant: 'secondary' },
  ready: { label: '✓ Đã lưu', variant: 'default' },
  failed: { label: '✕ Lỗi ghi hình', variant: 'outline' },
  stopped: { label: '■ Đã dừng', variant: 'secondary' },
};

export default function LiveHostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { evaluateAsync } = usePplpEvaluate();
  const { liveSessionId } = useParams<{ liveSessionId: string }>();
  const preLiveState = (location.state as { title?: string; privacy?: string } | null);

  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bootState, setBootState] = useState<BootState>('idle');
  const [bootError, setBootError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingStatus>('idle');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressProgress, setCompressProgress] = useState<number>(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const startedRef = useRef(false);
  const browserRecorderRef = useRef<RecorderController | null>(null);
  const lastSentViewerCountRef = useRef<number | null>(null);
  const viewerCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveSessionId = liveSessionId || createdSessionId || undefined;
  const sessionQuery = useLiveSession(effectiveSessionId);
  const session = sessionQuery.data;

  const {
    setLocalContainerRef,
    isJoined,
    isMuted,
    isCameraOff,
    statusText,
    start,
    leave,
    toggleMute,
    toggleCamera,
    getLocalTracks,
  } = useLiveRtc({
    sessionId: effectiveSessionId,
    role: 'host',
    enabled: !!effectiveSessionId && session?.status !== 'ended',
    onViewerCountChange: async (count) => {
      if (!effectiveSessionId) return;
      if (lastSentViewerCountRef.current === count) return;
      if (viewerCountTimerRef.current) {
        clearTimeout(viewerCountTimerRef.current);
      }
      viewerCountTimerRef.current = setTimeout(async () => {
        if (!effectiveSessionId) return;
        if (lastSentViewerCountRef.current === count) return;
        lastSentViewerCountRef.current = count;
        await updateLiveViewerCount(effectiveSessionId, count);
      }, 400);
    },
  });

  // Get local tracks for the chunked recording hook
  const localTracks = getLocalTracks();

  // Chunked recording hook
  const recording = useLiveRecording({
    videoTrack: CHUNKED_RECORDING_ENABLED ? (localTracks.video ?? null) : null,
    audioTrack: CHUNKED_RECORDING_ENABLED ? (localTracks.audio ?? null) : null,
    sessionId: CHUNKED_RECORDING_ENABLED ? effectiveSessionId : undefined,
    recordingId: CHUNKED_RECORDING_ENABLED ? (recordingId ?? undefined) : undefined,
    autoStart: CHUNKED_RECORDING_ENABLED && isJoined,
  });

  // Sync recording phase to UI state
  useEffect(() => {
    if (CHUNKED_RECORDING_ENABLED && recording.phase !== 'idle') {
      setRecordingState(phaseToRecordingStatus(recording.phase));
    }
  }, [recording.phase]);

  // Sync upload stats to progress
  useEffect(() => {
    if (CHUNKED_RECORDING_ENABLED && recording.uploadStats.total > 0) {
      setUploadProgress(Math.round((recording.uploadStats.uploaded / recording.uploadStats.total) * 100));
    }
  }, [recording.uploadStats]);

  const liveDuration = useLiveDuration(session?.started_at, session?.status === 'live' && isJoined);
  const { viewers } = useLivePresence(effectiveSessionId);

  const isHost = useMemo(() => !!session && !!userId && session.host_user_id === userId, [session, userId]);

  // Heartbeat: keep session alive every 15s
  useLiveHeartbeat(effectiveSessionId, isHost);

  // Realtime force-stop: if another device starts live, this session gets ended
  useEffect(() => {
    if (!effectiveSessionId) return;

    const channel = supabase
      .channel(`live-force-stop-${effectiveSessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${effectiveSessionId}`,
      }, (payload: any) => {
        if (payload.new.status === 'ended') {
          toast.info('Phiên live đã kết thúc vì bạn bắt đầu live từ thiết bị khác.');
          leave();
          navigate('/');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectiveSessionId, leave, navigate]);

  const runBootstrap = useCallback(async () => {
    setBootError(null);
    setBootState('auth');
    setCreatedSessionId(null);

    const authResult = await withTimeout(supabase.auth.getSession(), 8000, 'auth timeout');
    const currentUserId = authResult.data.session?.user?.id;
    if (!currentUserId) {
      throw new Error('Bạn cần đăng nhập để phát trực tiếp.');
    }
    setUserId(currentUserId);

    if (liveSessionId) {
      setBootState('loading');
      return;
    }

    setBootState('creating');
    const created = await withTimeout(
      createLiveSession({
        privacy: preLiveState?.privacy === 'friends' ? 'friends' : 'public',
        title: preLiveState?.title,
      }),
      15000,
      'create live session timeout'
    );
    setCreatedSessionId(created.id);

    // Create chunked_recordings row for DB tracking
    if (CHUNKED_RECORDING_ENABLED) {
      try {
        const recId = await createChunkedRecording(
          currentUserId,
          created.id,
          created.channel_name,
          'video/webm'
        );
        setRecordingId(recId);
      } catch (err) {
        console.warn('[LiveHost] createChunkedRecording failed:', err);
      }
    }

    setBootState('loading');
    navigate(`/live/${created.id}/host`, { replace: true });
  }, [liveSessionId, navigate]);

  useEffect(() => {
    let active = true;
    runBootstrap().catch((error) => {
      if (!active) return;
      setBootState('error');
      setBootError(toUserError(error));
    });

    return () => {
      active = false;
    };
  }, [retryNonce, runBootstrap]);

  useEffect(() => {
    if (typeof session?.viewer_count === 'number') {
      lastSentViewerCountRef.current = session.viewer_count;
    }
  }, [session?.viewer_count]);

  useEffect(() => {
    if (!effectiveSessionId) return;
    if (sessionQuery.isLoading) return;
    if (sessionQuery.isError) {
      setBootState('error');
      setBootError('Không tải được phiên LIVE. Vui lòng thử lại.');
      return;
    }
    if (!session) {
      setBootState('error');
      setBootError('Không tìm thấy phiên LIVE.');
      return;
    }
    if (bootState !== 'starting') {
      setBootState('ready');
    }
  }, [bootState, effectiveSessionId, session, sessionQuery.isError, sessionQuery.isLoading]);

  // Start Agora RTC + Browser Recording (legacy path only)
  useEffect(() => {
    if (!session || !isHost || session.status === 'ended' || startedRef.current) return;
    startedRef.current = true;
    setBootState('starting');

    start()
      .then(async () => {
        setBootState('ready');

        // Legacy single-blob recording (when chunked is disabled)
        if (!CHUNKED_RECORDING_ENABLED) {
          try {
            const tracks = getLocalTracks();
            if (tracks.video && tracks.audio) {
              const stream = new MediaStream();
              const videoTrack = tracks.video.getMediaStreamTrack();
              const audioTrack = tracks.audio.getMediaStreamTrack();
              if (videoTrack) stream.addTrack(videoTrack);
              if (audioTrack) stream.addTrack(audioTrack);

              const recorder = createRecorder(stream);
              recorder.start();
              browserRecorderRef.current = recorder;
              setRecordingState('recording');
              setRecordingError(null);
            } else {
              setRecordingState('failed');
              setRecordingError('Không lấy được track video/audio để ghi hình.');
            }
          } catch (recErr: any) {
            setRecordingState('failed');
            setRecordingError(recErr?.message || 'Không thể bắt đầu ghi hình.');
            toast.error('Không thể bắt đầu ghi hình bằng trình duyệt.');
          }
        }
        // Chunked recording is handled by useLiveRecording hook (autoStart)
      })
      .catch((error) => {
        startedRef.current = false;
        const message = toUserError(error);
        setBootState('error');
        setBootError(message);
        toast.error(message);
      });
  }, [effectiveSessionId, isHost, session, start, getLocalTracks]);

  useEffect(() => {
    if (session?.status === 'ended') {
      leave().catch(() => undefined);
    }
  }, [leave, session?.status]);

  useEffect(() => {
    return () => {
      if (viewerCountTimerRef.current) {
        clearTimeout(viewerCountTimerRef.current);
      }
      leave().catch(() => undefined);
    };
  }, [leave]);

  async function generateThumbnailFromBlob(blob: Blob): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(blob);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      let settled = false;

      const finish = (result: Blob | null) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(result);
      };

      const timer = setTimeout(() => finish(null), 10000);

      video.onloadeddata = () => {
        video.currentTime = Math.min(video.duration * 0.1, 2);
      };

      video.onseeked = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          canvas.getContext('2d')?.drawImage(video, 0, 0);
          canvas.toBlob((thumbBlob) => finish(thumbBlob), 'image/jpeg', 0.85);
        } catch {
          finish(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
    });
  }

  const handleEndLive = async (skipNavigate = false) => {
    if (!effectiveSessionId) return;
    if (viewerCountTimerRef.current) {
      clearTimeout(viewerCountTimerRef.current);
      viewerCountTimerRef.current = null;
    }

    let playbackUrl: string | null = null;
    let recordingStatus: RecordingStatus = 'failed';
    let thumbnailUrl: string | null = null;

    try {
      // === CHUNKED RECORDING PATH ===
      if (CHUNKED_RECORDING_ENABLED) {
        setRecordingState('stopping');
        try {
          // 1. Stop MediaRecorder
          await recording.stop();
          
          // 2. Flush queue + finalize (tạo manifest.json)
          const finalResult = await recording.finalize();
          playbackUrl = finalResult?.manifestUrl ?? null;
          recordingStatus = playbackUrl ? 'ready' : 'failed';
          setRecordingState(playbackUrl ? 'ready' : 'failed');
        } catch (chunkErr: any) {
          setRecordingState('failed');
          setRecordingError(chunkErr?.message || 'Chunked recording failed');
        }
      }
      // === LEGACY SINGLE-BLOB PATH ===
      else if (browserRecorderRef.current?.getState() === 'recording') {
        setRecordingState('stopping');
        const rawBlob = await browserRecorderRef.current.stop();
        if (rawBlob.size > 0) {
          // 1. Compress video before upload
          setRecordingState('compressing');
          setCompressProgress(0);
          const { compressVideo } = await import('@/utils/videoCompression');
          const blob = await compressVideo(rawBlob, {
            onProgress: (p) => setCompressProgress(p),
          });

          // 2. Upload compressed video
          setRecordingState('processing');
          setUploadProgress(0);

          // 2a. Generate thumbnail from video blob (silent fail)
          try {
            const thumbBlob = await generateThumbnailFromBlob(blob);
            if (thumbBlob) {
              thumbnailUrl = await uploadLiveThumbnail(thumbBlob, effectiveSessionId);
            }
          } catch {
            // thumbnail failure won't block video upload
          }

          // 2b. Upload video to R2 with progress tracking
          const { url } = await uploadLiveRecording(
            blob,
            effectiveSessionId,
            browserRecorderRef.current.getMimeType(),
            (percent) => setUploadProgress(percent)
          );
          playbackUrl = url;
          recordingStatus = 'ready';
          setRecordingState('ready');
        } else {
          setRecordingState('failed');
          setRecordingError('Video trống, không thể lưu replay.');
        }
      } else {
        setRecordingState('failed');
        setRecordingError('Không có bản ghi nào đang hoạt động.');
      }

      // 3. Finalize session & attach replay with thumbnail
      await finalizeLiveSession(effectiveSessionId, { playbackUrl, recordingStatus });

      if (playbackUrl) {
        try {
          await attachLiveReplayToPost(effectiveSessionId, playbackUrl, undefined, thumbnailUrl);
        } catch (attachErr) {
          console.warn('[LiveHost] attachLiveReplayToPost failed:', attachErr);
        }
      }

      await leave();
      // PPLP: Evaluate livestream action for Light Score
      evaluateAsync({ action_type: 'livestream', reference_id: effectiveSessionId });
      toast.success('Live đã kết thúc!');
      if (!skipNavigate) {
        navigate(`/live/${effectiveSessionId}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể kết thúc live');
    }
  };

  const handleRetry = () => {
    startedRef.current = false;
    setBootError(null);
    setBootState('idle');
    setRetryNonce((x) => x + 1);
  };

  const isEnding = ['stopping', 'compressing', 'processing'].includes(recordingState);

  // Navigation guard: block leaving page while live
  const shouldBlock = isHost && session?.status === 'live' && isJoined && !isEnding;
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const pendingNavigationRef = useRef<string | null>(null);

  // Intercept browser back/forward via popstate
  useEffect(() => {
    if (!shouldBlock) return;
    const handler = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveDialog(true);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [shouldBlock]);

  // Warn on tab close / refresh while live
  useEffect(() => {
    if (!shouldBlock) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldBlock]);

  // Intercept programmatic navigation via navigate()
  const guardedNavigate = useCallback((to: string) => {
    if (shouldBlock) {
      pendingNavigationRef.current = to;
      setShowLeaveDialog(true);
    } else {
      navigate(to);
    }
  }, [shouldBlock, navigate]);

  const handleConfirmLeave = async () => {
    await handleEndLive(true);
    setShowLeaveDialog(false);
    if (pendingNavigationRef.current) {
      navigate(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    } else {
      navigate('/');
    }
  };

  const showLoader =
    ['idle', 'auth', 'creating', 'loading', 'starting'].includes(bootState) ||
    (!!effectiveSessionId && sessionQuery.isLoading);

  if (showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>
            {bootState === 'creating'
              ? 'Đang tạo phiên LIVE...'
              : bootState === 'starting'
                ? 'Đang kết nối...'
                : 'Đang tải...'}
          </span>
        </div>
      </div>
    );
  }

  if (bootState === 'error') {
    return (
      <div className="min-h-screen bg-background">
        <FacebookNavbar />
        <div className="pt-20 px-4 max-w-xl mx-auto">
          <Card className="p-6 space-y-4">
            <div className="font-semibold text-lg">Không thể bắt đầu LIVE</div>
            <div className="text-sm text-muted-foreground">{bootError || 'Đã xảy ra lỗi không xác định.'}</div>
            <div className="flex items-center gap-2">
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Thử lại
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Quay về trang chủ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 space-y-3">
          <div>Live session not found.</div>
          <Button onClick={handleRetry}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="min-h-screen bg-background">
        <FacebookNavbar />
        <div className="pt-20 px-4 max-w-3xl mx-auto">
          <Card className="p-6 text-center space-y-4">
            <p className="font-semibold">You are not the host of this live session.</p>
            <Button onClick={() => navigate(`/live/${session.id}`)}>Switch to viewer mode</Button>
          </Card>
        </div>
      </div>
    );
  }

  const recBadge = REC_BADGE[recordingState];

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main className="pt-16 px-3 md:px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold">{session.title || 'Live Stream'}</h1>
                <div className="text-sm text-muted-foreground">Channel: {session.agora_channel || session.channel_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.status === 'live' && isJoined ? 'destructive' : 'secondary'} className="gap-1">
                  <Radio className="h-3.5 w-3.5" />
                  {session.status === 'ended' ? 'ENDED' : isJoined ? 'LIVE' : 'CONNECTING'}
                </Badge>
                {session.status === 'live' && isJoined && (
                  <Badge variant="outline" className="gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5" />
                    {liveDuration}
                  </Badge>
                )}
                <Badge variant={recBadge.variant}>
                  {recBadge.label}
                  {CHUNKED_RECORDING_ENABLED && recordingState === 'recording' && recording.uploadStats.total > 0
                    ? ` (${recording.uploadStats.uploaded}/${recording.uploadStats.total})`
                    : ''}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {viewers.length}
                </Badge>
              </div>
            </div>

            {recordingError ? (
              <Card className="p-3 text-sm border-destructive/30 text-destructive">
                Ghi hình: {recordingError}
              </Card>
            ) : null}


            {recordingState === 'stopping' && (
              <Card className="p-3 text-sm border-primary/30 text-primary flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang dừng ghi hình...
              </Card>
            )}

            {recordingState === 'compressing' && (
              <Card className="p-4 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Đang nén video...
                  </span>
                  <span className="ml-auto text-sm font-mono font-bold text-primary">
                    {compressProgress}%
                  </span>
                </div>
                <Progress value={compressProgress} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Vui lòng không đóng tab — đang nén video để giảm dung lượng
                </p>
              </Card>
            )}

            {recordingState === 'processing' && CHUNKED_RECORDING_ENABLED && (
              <Card className="p-4 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {recording.uploadStats.total > 0
                      ? `Đang tải lên chunk ${recording.uploadStats.uploaded}/${recording.uploadStats.total}...`
                      : 'Đang xử lý...'}
                  </span>
                  <span className="ml-auto text-sm font-mono font-bold text-primary">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Chunked upload — video sẽ được lưu an toàn từng phần
                </p>
              </Card>
            )}

            {recordingState === 'processing' && !CHUNKED_RECORDING_ENABLED && (
              <Card className="p-4 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Đang tải video lên...
                  </span>
                  <span className="ml-auto text-sm font-mono font-bold text-primary">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Vui lòng không đóng tab — video sẽ bị mất nếu thoát trang
                </p>
              </Card>
            )}


            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative">
                <div ref={setLocalContainerRef} className="h-full w-full" />
                {!isJoined && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/90 bg-black/50">
                    {statusText}
                  </div>
                )}
                {effectiveSessionId && <FloatingReactions sessionId={effectiveSessionId} />}
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleMute} disabled={!isJoined || isEnding}>
                {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button variant="outline" onClick={toggleCamera} disabled={!isJoined || isEnding}>
                {isCameraOff ? <VideoOff className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
                {isCameraOff ? 'Camera On' : 'Camera Off'}
              </Button>
              <Button variant="destructive" onClick={() => setShowEndConfirm(true)} disabled={isEnding}>
                {isEnding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PhoneOff className="h-4 w-4 mr-2" />}
                {isEnding ? 'Đang xử lý...' : 'End Live'}
              </Button>
            </div>
          </section>

          {effectiveSessionId && <LiveChatPanel sessionId={effectiveSessionId} isHost={true} liveTitle={session?.title || undefined} className="h-[70vh] lg:h-[calc(100vh-120px)]" />}
        </div>
      </main>
      {/* Navigation guard dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời khỏi Live Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang phát trực tiếp. Nếu rời đi, buổi live sẽ kết thúc và video sẽ được lưu lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>Kết thúc & Rời đi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* End Live confirmation dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc kết thúc buổi Live Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              Buổi live sẽ kết thúc và video sẽ được lưu lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleEndLive()}>Kết thúc</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
