/**
 * ChunkedVideoPlayer
 * Progressive streaming player using MediaSource Extensions (MSE).
 * Features: buffer management, lazy chunk loading, QuotaExceeded recovery.
 * Falls back to blob concatenation if MSE doesn't support the codec.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ManifestChunk {
  seq: number;
  key: string;
  url: string;
  bytes: number;
  duration_ms: number;
}

interface Manifest {
  recording_id: string;
  version: number;
  codec: string;
  mime_type: string;
  total_duration_ms: number;
  chunks: ManifestChunk[];
}

interface ChunkedVideoPlayerProps {
  manifestUrl: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onError?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_RETRY = 3;
/** How far ahead of currentTime to buffer (seconds) */
const BUFFER_AHEAD_S = 30;
/** How far behind currentTime to keep in SourceBuffer (seconds) */
const BUFFER_BEHIND_S = 15;
/** Interval to check if we need more chunks (ms) */
const POLL_INTERVAL_MS = 1000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function fetchWithRetry(url: string, retries = MAX_RETRY): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

/** Build cumulative time offsets from chunk durations */
function buildTimeMap(chunks: ManifestChunk[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const c of chunks) {
    offsets.push(acc);
    acc += c.duration_ms / 1000;
  }
  return offsets;
}

/** Find the chunk index that covers a given time (seconds) */
function chunkIndexForTime(timeS: number, offsets: number[]): number {
  for (let i = offsets.length - 1; i >= 0; i--) {
    if (timeS >= offsets[i]) return i;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ChunkedVideoPlayer({
  manifestUrl,
  className = '',
  autoPlay = false,
  controls = true,
  onReady,
  onError: onErrorCallback,
}: ChunkedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---- MSE path with buffer management ---- */
  const loadWithMSE = useCallback(async (manifest: Manifest) => {
    const video = videoRef.current;
    if (!video) return;

    const mediaSource = new MediaSource();
    const msUrl = URL.createObjectURL(mediaSource);
    video.src = msUrl;

    await new Promise<void>(resolve => {
      mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
    });

    const mimeWithCodec = manifest.codec
      ? `${manifest.mime_type}; codecs="${manifest.codec}"`
      : manifest.mime_type;

    const sourceBuffer = mediaSource.addSourceBuffer(mimeWithCodec);

    const offsets = buildTimeMap(manifest.chunks);
    const totalDuration = manifest.total_duration_ms / 1000;

    // Track which chunks have been fetched
    const fetched = new Set<number>();
    const fetching = new Set<number>();
    let destroyed = false;
    let firstChunkAppended = false;

    /* --- Queue for safe appendBuffer --- */
    const queue: ArrayBuffer[] = [];
    let appending = false;

    const processQueue = () => {
      if (appending || queue.length === 0) return;
      if (mediaSource.readyState !== 'open') return;
      appending = true;
      try {
        sourceBuffer.appendBuffer(queue.shift()!);
      } catch (e: any) {
        appending = false;
        if (e.name === 'QuotaExceededError') {
          console.warn('[ChunkedVideoPlayer] QuotaExceeded → evicting old buffer');
          evictOldBuffer().then(() => processQueue());
        } else {
          console.error('[ChunkedVideoPlayer] appendBuffer error:', e);
        }
      }
    };

    sourceBuffer.addEventListener('updateend', () => {
      appending = false;
      processQueue();
    });

    sourceBuffer.addEventListener('error', () => {
      console.error('[ChunkedVideoPlayer] SourceBuffer error');
    });

    /* --- Buffer eviction: remove data well behind currentTime --- */
    const evictOldBuffer = (): Promise<void> => {
      return new Promise(resolve => {
        if (sourceBuffer.updating || mediaSource.readyState !== 'open') {
          resolve();
          return;
        }
        const ct = video.currentTime;
        const removeEnd = ct - BUFFER_BEHIND_S;
        if (removeEnd <= 0 || sourceBuffer.buffered.length === 0) {
          resolve();
          return;
        }
        const bufStart = sourceBuffer.buffered.start(0);
        if (bufStart >= removeEnd) {
          resolve();
          return;
        }
        sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
        try {
          sourceBuffer.remove(bufStart, removeEnd);
        } catch {
          resolve();
        }
      });
    };

    /* --- Fetch a single chunk and append --- */
    const loadChunk = async (idx: number) => {
      if (destroyed || fetched.has(idx) || fetching.has(idx)) return;
      if (idx < 0 || idx >= manifest.chunks.length) return;
      fetching.add(idx);
      try {
        const data = await fetchWithRetry(manifest.chunks[idx].url);
        if (destroyed) return;
        fetched.add(idx);
        queue.push(data);
        processQueue();

        if (!firstChunkAppended) {
          firstChunkAppended = true;
          setLoading(false);
          onReady?.();
          if (autoPlay) video.play().catch(() => {});
        }
      } catch (err) {
        console.error(`[ChunkedVideoPlayer] Failed to load chunk ${idx}:`, err);
      } finally {
        fetching.delete(idx);
      }
    };

    /* --- Determine which chunks to load based on currentTime --- */
    const ensureBuffered = async () => {
      if (destroyed || mediaSource.readyState !== 'open') return;

      // Evict old data first
      await evictOldBuffer();

      const ct = video.currentTime;
      const startIdx = chunkIndexForTime(ct, offsets);
      const endTime = ct + BUFFER_AHEAD_S;
      const endIdx = Math.min(chunkIndexForTime(endTime, offsets) + 1, manifest.chunks.length - 1);

      // Load chunks from startIdx to endIdx
      const promises: Promise<void>[] = [];
      for (let i = startIdx; i <= endIdx; i++) {
        if (!fetched.has(i) && !fetching.has(i)) {
          promises.push(loadChunk(i));
        }
      }
      await Promise.all(promises);
    };

    /* --- Video event listeners --- */
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onSeeked = () => ensureBuffered();

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('seeked', onSeeked);

    /* --- Initial load: fetch first few chunks --- */
    await ensureBuffered();

    /* --- Poll to keep buffer filled ahead --- */
    const pollId = setInterval(() => {
      if (!destroyed) ensureBuffered();
    }, POLL_INTERVAL_MS);

    /* --- End of stream detection --- */
    const checkEnd = setInterval(() => {
      if (destroyed) return;
      if (fetched.size === manifest.chunks.length && queue.length === 0 && !sourceBuffer.updating) {
        if (mediaSource.readyState === 'open') {
          try {
            mediaSource.endOfStream();
          } catch {}
        }
        clearInterval(checkEnd);
      }
    }, 2000);

    /* --- Cleanup --- */
    cleanupRef.current = () => {
      destroyed = true;
      clearInterval(pollId);
      clearInterval(checkEnd);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('seeked', onSeeked);
      URL.revokeObjectURL(msUrl);
    };
  }, [autoPlay, onReady]);

  /* ---- Blob fallback (unchanged, for non-MSE browsers) ---- */
  const loadWithBlob = useCallback(async (manifest: Manifest) => {
    const video = videoRef.current;
    if (!video) return;

    const blobs: Blob[] = [];
    for (let i = 0; i < manifest.chunks.length; i++) {
      if (abortRef.current?.signal.aborted) return;
      const data = await fetchWithRetry(manifest.chunks[i].url);
      blobs.push(new Blob([data]));
    }

    const fullBlob = new Blob(blobs, { type: manifest.mime_type || 'video/webm' });
    const url = URL.createObjectURL(fullBlob);
    video.src = url;

    setLoading(false);
    onReady?.();
    if (autoPlay) video.play().catch(() => {});

    cleanupRef.current = () => URL.revokeObjectURL(url);
  }, [autoPlay, onReady]);

  /* ---- Entry point ---- */
  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const manifest: Manifest = await res.json();

      if (!manifest.chunks?.length) throw new Error('No chunks in manifest');

      const mimeWithCodec = manifest.codec
        ? `${manifest.mime_type}; codecs="${manifest.codec}"`
        : manifest.mime_type;

      const useMSE =
        typeof MediaSource !== 'undefined' &&
        MediaSource.isTypeSupported(mimeWithCodec);

      if (useMSE) {
        await loadWithMSE(manifest);
      } else {
        console.warn('[ChunkedVideoPlayer] MSE not supported for', mimeWithCodec, '→ fallback to blob');
        await loadWithBlob(manifest);
      }
    } catch (err: any) {
      if (abortRef.current?.signal.aborted) return;
      setError(err.message || 'Failed to load video');
      setLoading(false);
      onErrorCallback?.();
    }
  }, [manifestUrl, loadWithMSE, loadWithBlob, onErrorCallback]);

  useEffect(() => {
    start();
    return () => {
      abortRef.current?.abort();
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [start]);

  /* ---- Render ---- */
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/90 text-white/70 text-sm p-4 ${className}`}>
        <span>⚠️ {error}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {(loading || buffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        </div>
      )}
      <video
        ref={videoRef}
        controls={controls}
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default ChunkedVideoPlayer;
