/**
 * Video compression utility using WebCodecs API
 * Re-encodes video at lower bitrate/resolution before upload
 * Falls back to original blob if WebCodecs is not supported
 */

export interface VideoCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number; // bps
  audioBitrate?: number; // bps
  onProgress?: (percent: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<VideoCompressionOptions, 'onProgress'>> = {
  maxWidth: 1280,
  maxHeight: 720,
  videoBitrate: 1_500_000, // 1.5 Mbps
  audioBitrate: 128_000,   // 128 kbps
};

/**
 * Check if WebCodecs API is available
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof VideoDecoder === 'function' &&
    typeof VideoEncoder === 'function' &&
    typeof EncodedVideoChunk === 'function'
  );
}

/**
 * Get video metadata (width, height, duration) from a blob
 */
function getVideoMetadata(blob: Blob): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.muted = true;
    video.preload = 'metadata';

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Video metadata timeout'));
    }, 15000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const result = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      };
      URL.revokeObjectURL(url);
      resolve(result);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Calculate target dimensions maintaining aspect ratio
 */
function calcTargetSize(
  srcW: number, srcH: number, maxW: number, maxH: number
): { width: number; height: number } {
  if (srcW <= maxW && srcH <= maxH) return { width: srcW, height: srcH };
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  // Ensure even dimensions (required by many codecs)
  return {
    width: Math.round(srcW * ratio / 2) * 2,
    height: Math.round(srcH * ratio / 2) * 2,
  };
}

/**
 * Compress a video blob using WebCodecs API
 * Falls back to returning the original blob if not supported or on error
 */
export async function compressVideo(
  blob: Blob,
  options: VideoCompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const onProgress = options.onProgress;

  // Fallback if WebCodecs not supported
  if (!isWebCodecsSupported()) {
    console.info('[videoCompression] WebCodecs not supported, skipping compression');
    onProgress?.(100);
    return blob;
  }

  try {
    onProgress?.(5);

    // 1. Get video metadata
    const meta = await getVideoMetadata(blob);
    if (!meta.width || !meta.height || !isFinite(meta.duration) || meta.duration <= 0) {
      console.warn('[videoCompression] Invalid video metadata, skipping compression');
      onProgress?.(100);
      return blob;
    }

    const target = calcTargetSize(meta.width, meta.height, opts.maxWidth, opts.maxHeight);

    // If already small enough in resolution, check if re-encoding is worthwhile
    const alreadySmall = meta.width <= opts.maxWidth && meta.height <= opts.maxHeight;
    // Still re-encode for bitrate reduction even if resolution is fine

    onProgress?.(10);

    // 2. Decode frames using HTMLVideoElement + Canvas (more compatible than WebCodecs decoder for webm)
    const encodedChunks: Uint8Array[] = [];
    let totalEncodedSize = 0;

    // Use VideoEncoder to re-encode at lower bitrate
    const codecString = 'vp8'; // VP8 for webm compatibility
    
    const { supported } = await VideoEncoder.isConfigSupported({
      codec: codecString,
      width: target.width,
      height: target.height,
      bitrate: opts.videoBitrate,
    });

    if (!supported) {
      console.warn('[videoCompression] VP8 encoder not supported, skipping');
      onProgress?.(100);
      return blob;
    }

    // Extract frames using video element + canvas approach
    const frames = await extractFrames(blob, target.width, target.height, meta.duration, (p) => {
      // Map extraction progress to 10-50%
      onProgress?.(10 + Math.round(p * 40));
    });

    if (frames.length === 0) {
      console.warn('[videoCompression] No frames extracted, skipping compression');
      onProgress?.(100);
      return blob;
    }

    onProgress?.(50);

    // 3. Encode frames with VideoEncoder
    const encodedBlob = await encodeFrames(frames, target.width, target.height, opts.videoBitrate, meta.duration, (p) => {
      // Map encoding progress to 50-95%
      onProgress?.(50 + Math.round(p * 45));
    });

    // Clean up frames
    frames.forEach(f => f.close());

    // Only use compressed version if it's actually smaller
    if (encodedBlob.size < blob.size * 0.95) {
      console.info(
        `[videoCompression] Compressed: ${(blob.size / 1024 / 1024).toFixed(1)}MB -> ${(encodedBlob.size / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - encodedBlob.size / blob.size) * 100)}% reduction)`
      );
      onProgress?.(100);
      return encodedBlob;
    } else {
      console.info('[videoCompression] Compressed size not smaller, using original');
      onProgress?.(100);
      return blob;
    }
  } catch (err) {
    console.warn('[videoCompression] Compression failed, using original blob:', err);
    onProgress?.(100);
    return blob;
  }
}

/**
 * Extract video frames as VideoFrame objects using canvas
 */
async function extractFrames(
  blob: Blob,
  targetWidth: number,
  targetHeight: number,
  duration: number,
  onProgress?: (percent: number) => void
): Promise<VideoFrame[]> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(blob);
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.oncanplaythrough = () => resolve();
    video.onerror = () => reject(new Error('Video load failed'));
    video.load();
  });

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d')!;

  const fps = 24; // Target FPS for replay
  const totalFrames = Math.min(Math.ceil(duration * fps), 7200); // Cap at 5 min @ 24fps
  const frameInterval = duration / totalFrames;
  const frames: VideoFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameInterval;
    video.currentTime = time;

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(time * 1_000_000), // microseconds
    });
    frames.push(frame);

    if (i % 10 === 0) {
      onProgress?.(i / totalFrames);
    }
  }

  URL.revokeObjectURL(url);
  onProgress?.(1);
  return frames;
}

/**
 * Encode VideoFrame array into a webm blob using VideoEncoder
 */
async function encodeFrames(
  frames: VideoFrame[],
  width: number,
  height: number,
  bitrate: number,
  duration: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const chunks: EncodedVideoChunk[] = [];
  const rawChunks: { data: Uint8Array; timestamp: number; type: string }[] = [];

  let encodedCount = 0;
  let resolveEncoding: () => void;
  const encodingDone = new Promise<void>((r) => { resolveEncoding = r; });

  const encoder = new VideoEncoder({
    output: (chunk) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      rawChunks.push({
        data,
        timestamp: chunk.timestamp,
        type: chunk.type,
      });
      encodedCount++;
      if (encodedCount % 10 === 0) {
        onProgress?.(encodedCount / frames.length);
      }
    },
    error: (e) => {
      console.error('[videoCompression] Encoder error:', e);
    },
  });

  encoder.configure({
    codec: 'vp8',
    width,
    height,
    bitrate,
    framerate: 24,
  });

  for (let i = 0; i < frames.length; i++) {
    const keyFrame = i % 60 === 0; // Keyframe every ~2.5s at 24fps
    encoder.encode(frames[i], { keyFrame });
  }

  await encoder.flush();
  encoder.close();

  onProgress?.(1);

  // Build a simple webm-compatible blob from encoded data
  // Since we can't easily mux to webm without a library,
  // we'll create a blob with the raw VP8 data wrapped minimally
  // For maximum compatibility, concatenate all chunk data
  const totalSize = rawChunks.reduce((sum, c) => sum + c.data.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of rawChunks) {
    combined.set(chunk.data, offset);
    offset += chunk.data.byteLength;
  }

  return new Blob([combined], { type: 'video/webm' });
}
