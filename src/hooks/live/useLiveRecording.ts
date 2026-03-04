import { useRef, useState, useCallback, useEffect } from 'react';
import type { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { createChunkedRecorder, type ChunkedRecorderController } from '@/modules/live/recording/chunkedRecorder';
import { createChunkUploadQueue, type ChunkUploadQueueController } from '@/modules/live/recording/chunkUploadQueue';
import { uploadLiveChunk, finalizeLiveChunks } from '@/modules/live/liveService';
import { initRecoverySession, saveChunkKey, clearRecovery } from '@/modules/live/recording/crashRecovery';

export type RecordingPhase = 'idle' | 'recording' | 'stopping' | 'uploading' | 'done' | 'error';

interface UseLiveRecordingOptions {
  videoTrack: ICameraVideoTrack | null;
  audioTrack: IMicrophoneAudioTrack | null;
  sessionId?: string;
  recordingId?: string;
  autoStart?: boolean;
}

export function useLiveRecording({ videoTrack, audioTrack, sessionId, recordingId, autoStart = true }: UseLiveRecordingOptions) {
  const recorderRef = useRef<ChunkedRecorderController | null>(null);
  const queueRef = useRef<ChunkUploadQueueController | null>(null);
  const chunkKeysRef = useRef<string[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [chunkCount, setChunkCount] = useState(0);
  const [uploadStats, setUploadStats] = useState({ total: 0, uploaded: 0, failed: 0 });
  const startedRef = useRef(false);

  const start = useCallback(() => {
    if (!videoTrack || !audioTrack || !sessionId || !recordingId || recorderRef.current) return;

    try {
      const videoMediaTrack = videoTrack.getMediaStreamTrack();
      const audioMediaTrack = audioTrack.getMediaStreamTrack();
      if (!videoMediaTrack || !audioMediaTrack) return;

      const stream = new MediaStream([videoMediaTrack, audioMediaTrack]);

      // Init IndexedDB backup
      initRecoverySession(sessionId, 'video/webm').catch(() => {});

      // Create upload queue — now uses presigned URL via Edge Function
      const currentRecordingId = recordingId;
      const queue = createChunkUploadQueue({
        sessionId,
        maxRetries: 3,
        uploadFn: async (chunk) => {
          const key = await uploadLiveChunk(chunk.blob, currentRecordingId, chunk.index, chunk.mimeType);
          chunkKeysRef.current.push(key);
          saveChunkKey(sessionId, key).catch(() => {});
          return key;
        },
        onProgress: (uploaded, total) => {
          setUploadStats({ total, uploaded, failed: 0 });
        },
        onError: (err, chunk) => {
          console.error(`[useLiveRecording] chunk #${chunk.index} upload failed:`, err);
          setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        },
      });
      queueRef.current = queue;

      const recorder = createChunkedRecorder({
        stream,
        chunkDurationMs: 2000,
        onChunk: (chunk) => {
          setChunkCount((c) => c + 1);
          mimeTypeRef.current = chunk.mimeType;
          queue.enqueue(chunk);
        },
        onError: (err) => {
          console.error('[useLiveRecording] recorder error:', err);
        },
      });

      recorder.start();
      recorderRef.current = recorder;
      setPhase('recording');
    } catch (err) {
      console.error('[useLiveRecording] failed to start:', err);
      setPhase('error');
    }
  }, [videoTrack, audioTrack, sessionId, recordingId]);

  const stop = useCallback(async (): Promise<{ blob: Blob; mimeType: string } | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return null;

    setPhase('stopping');
    try {
      const blob = await recorder.stop();
      const mimeType = recorder.getMimeType();
      recorderRef.current = null;
      setPhase('idle');
      return { blob, mimeType };
    } catch (err) {
      console.error('[useLiveRecording] stop error:', err);
      setPhase('error');
      return null;
    }
  }, []);

  const finalize = useCallback(async (): Promise<{ manifestUrl: string; totalChunks: number } | null> => {
    const queue = queueRef.current;
    if (!queue || !recordingId) return null;

    setPhase('uploading');
    try {
      await queue.flush();

      const result = await finalizeLiveChunks(recordingId, sessionId);
      await clearRecovery(sessionId!).catch(() => {});
      setPhase('done');
      return result;
    } catch (err) {
      console.error('[useLiveRecording] finalize error:', err);
      setPhase('error');
      return null;
    }
  }, [recordingId, sessionId]);

  // Auto-start when tracks are ready
  useEffect(() => {
    if (autoStart && videoTrack && audioTrack && sessionId && recordingId && !startedRef.current && phase === 'idle') {
      startedRef.current = true;
      const timer = setTimeout(() => start(), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, videoTrack, audioTrack, sessionId, recordingId, phase, start]);

  // beforeunload warning while recording
  useEffect(() => {
    if (phase !== 'recording') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // Cleanup on unmount — stop recorder + flush queue (best-effort)
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.getState() === 'recording') {
        recorderRef.current.stop().catch(() => {});
      }
      // Flush remaining chunks to R2 (non-blocking, auto-finalize will handle manifest)
      if (queueRef.current) {
        queueRef.current.flush().catch(() => {});
      }
    };
  }, []);

  return { phase, setPhase, chunkCount, uploadStats, start, stop, finalize };
}
