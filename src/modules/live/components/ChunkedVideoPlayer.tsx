/**
 * ChunkedVideoPlayer
 * MVP player that fetches manifest.json and plays chunks sequentially
 * Uses blob concatenation as the primary strategy (most browser compatible)
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
  const [progress, setProgress] = useState(0); // 0-100 loading progress
  const blobUrlRef = useRef<string | null>(null);

  const loadAndPlay = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch manifest
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const manifest: Manifest = await res.json();

      if (!manifest.chunks || manifest.chunks.length === 0) {
        throw new Error('No chunks in manifest');
      }

      // 2. Download all chunks and concatenate
      const blobs: Blob[] = [];
      for (let i = 0; i < manifest.chunks.length; i++) {
        const chunk = manifest.chunks[i];
        const chunkRes = await fetch(chunk.url);
        if (!chunkRes.ok) throw new Error(`Failed to fetch chunk ${chunk.seq}`);
        blobs.push(await chunkRes.blob());
        setProgress(Math.round(((i + 1) / manifest.chunks.length) * 100));
      }

      // 3. Concatenate into single blob
      const fullBlob = new Blob(blobs, { type: manifest.mime_type || 'video/webm' });

      // 4. Create object URL and set on video
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(fullBlob);
      blobUrlRef.current = url;

      if (videoRef.current) {
        videoRef.current.src = url;
        if (autoPlay) {
          videoRef.current.play().catch(() => {});
        }
      }

      setLoading(false);
      onReady?.();
    } catch (err: any) {
      setError(err.message || 'Failed to load video');
      setLoading(false);
      onErrorCallback?.();
    }
  }, [manifestUrl, autoPlay, onReady, onErrorCallback]);

  useEffect(() => {
    loadAndPlay();
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [loadAndPlay]);

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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white/70 mb-2" />
          <span className="text-white/70 text-sm">
            Đang tải video... {progress}%
          </span>
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
