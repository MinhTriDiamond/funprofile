/**
 * ChunkedVideoPlayer
 * Progressive streaming player using MediaSource Extensions (MSE).
 * Falls back to blob concatenation if MSE doesn't support the codec.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

const MAX_RETRY = 3;

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
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadWithMSE = useCallback(async (manifest: Manifest) => {
    const video = videoRef.current;
    if (!video) return;

    const mediaSource = new MediaSource();
    const msUrl = URL.createObjectURL(mediaSource);
    video.src = msUrl;

    await new Promise<void>((resolve) => {
      mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
    });

    const mimeWithCodec = manifest.codec
      ? `${manifest.mime_type}; codecs="${manifest.codec}"`
      : manifest.mime_type;

    const sourceBuffer = mediaSource.addSourceBuffer(mimeWithCodec);
    const queue: ArrayBuffer[] = [];
    let appending = false;

    const processQueue = () => {
      if (appending || queue.length === 0) return;
      if (mediaSource.readyState !== 'open') return;
      appending = true;
      sourceBuffer.appendBuffer(queue.shift()!);
    };

    sourceBuffer.addEventListener('updateend', () => {
      appending = false;
      processQueue();
    });

    const appendData = (data: ArrayBuffer) => {
      queue.push(data);
      processQueue();
    };

    // Load chunks progressively
    for (let i = 0; i < manifest.chunks.length; i++) {
      if (abortRef.current?.signal.aborted) return;

      const data = await fetchWithRetry(manifest.chunks[i].url);
      if (abortRef.current?.signal.aborted) return;

      appendData(data);

      // After first chunk: start playback & hide loading
      if (i === 0) {
        setLoading(false);
        onReady?.();
        if (autoPlay) {
          video.play().catch(() => {});
        }
      }
    }

    // Wait for queue to drain, then signal end of stream
    const waitDrain = () => new Promise<void>((resolve) => {
      const check = () => {
        if (queue.length === 0 && !sourceBuffer.updating) {
          resolve();
        } else {
          sourceBuffer.addEventListener('updateend', check, { once: true });
        }
      };
      check();
    });

    await waitDrain();
    if (mediaSource.readyState === 'open') {
      mediaSource.endOfStream();
    }

    cleanupRef.current = () => {
      URL.revokeObjectURL(msUrl);
    };
  }, [autoPlay, onReady]);

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

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const manifest: Manifest = await res.json();

      if (!manifest.chunks?.length) throw new Error('No chunks in manifest');

      // Determine MSE support for this codec
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

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/90 text-white/70 text-sm p-4 ${className}`}>
        <span>⚠️ {error}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
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
