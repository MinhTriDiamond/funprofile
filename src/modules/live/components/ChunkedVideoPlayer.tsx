/**
 * ChunkedVideoPlayer
 *
 * How it works:
 * - Build a deterministic time->chunk index from manifest timing metadata.
 * - On seek, cancel in-flight fetches, clear old buffered data, then fetch/append target-first.
 * - Keep SourceBuffer healthy with sliding eviction (behind playhead and extreme far-ahead trim).
 * - Append through a single-writer queue (high/normal/low priority) to respect MSE ordering rules.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SocialVideoPlayer } from '@/components/ui/SocialVideoPlayer';

interface ManifestChunk {
  seq: number;
  key?: string;
  url: string;
  bytes?: number;
  duration_ms?: number;
  durationMs?: number;
  startMs?: number;
  endMs?: number;
}

interface Manifest {
  recording_id?: string;
  version?: number;
  codec?: string;
  mime_type?: string;
  total_duration_ms?: number;
  chunks: ManifestChunk[];
}

export interface ChunkedVideoPlayerProps {
  manifestUrl: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onError?: () => void;
}

type Priority = 'high' | 'normal' | 'low';

type NormalizedChunk = {
  seq: number;
  url: string;
  startS: number;
  endS: number;
  durationS: number;
  index: number;
};

type NormalizedTimeline = {
  chunks: NormalizedChunk[];
  startTimes: number[];
  endTimes: number[];
  seqToIndex: Map<number, number>;
  totalDurationS: number;
  isEstimatedTimeline: boolean;
};

const MAX_RETRY = 3;
const MAX_FAILED_CHUNKS = 3;
const MAX_SB_ERRORS = 3;

const BUFFER_AHEAD_FAST_S = 60;
const BUFFER_AHEAD_SLOW_S = 30;
const BUFFER_BEHIND_S = 15;
const SLOW_NETWORK_BPS = 500 * 1024;

const SEEK_DEBOUNCE_MS = 200;
const SEEK_AHEAD_WINDOW_S = 25;
const SEEK_BEHIND_WINDOW_S = 12;

const BUFFERING_DEBOUNCE_MS = 300;
const PREFETCH_HORIZON_S = 180;
const PREFETCH_CONCURRENCY = 5;
const SCHEDULER_INTERVAL_MS = 350;

const R2_DEV_PATTERN = /https:\/\/pub-[a-f0-9]+\.r2\.dev/g;
const R2_CUSTOM_DOMAIN = 'https://media.fun.rich';

const IS_MOBILE = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
const MAX_CACHE_BYTES = IS_MOBILE ? 30 * 1024 * 1024 : 80 * 1024 * 1024;

function normalizeR2Url(url: string): string {
  return url.replace(R2_DEV_PATTERN, R2_CUSTOM_DOMAIN);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function once<T extends EventTarget>(target: T, eventName: string): Promise<Event> {
  return new Promise(resolve => {
    target.addEventListener(eventName, resolve, { once: true });
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function toDurationSeconds(chunk: ManifestChunk): number | null {
  const rawMs = chunk.duration_ms ?? chunk.durationMs;
  if (typeof rawMs === 'number' && rawMs > 0) return rawMs / 1000;
  if (typeof chunk.startMs === 'number' && typeof chunk.endMs === 'number' && chunk.endMs > chunk.startMs) {
    return (chunk.endMs - chunk.startMs) / 1000;
  }
  return null;
}

function normalizeTimeline(chunks: ManifestChunk[]): NormalizedTimeline {
  const sorted = [...chunks].sort((a, b) => a.seq - b.seq);
  const knownDurations = sorted
    .map(toDurationSeconds)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const fallbackDurationS = median(knownDurations) || 2;

  const normalized: NormalizedChunk[] = [];
  const seqToIndex = new Map<number, number>();
  const startTimes: number[] = [];
  const endTimes: number[] = [];

  let acc = 0;
  let estimated = false;

  for (let index = 0; index < sorted.length; index++) {
    const chunk = sorted[index];
    const durationS = toDurationSeconds(chunk) ?? fallbackDurationS;

    let startS: number;
    let endS: number;

    if (typeof chunk.startMs === 'number' && typeof chunk.endMs === 'number' && chunk.endMs > chunk.startMs) {
      startS = chunk.startMs / 1000;
      endS = chunk.endMs / 1000;
    } else if (typeof chunk.startMs === 'number') {
      startS = chunk.startMs / 1000;
      endS = startS + durationS;
      estimated = true;
    } else {
      startS = acc;
      endS = startS + durationS;
      estimated = true;
    }

    startS = Math.max(startS, acc);
    endS = Math.max(endS, startS + 0.001);
    acc = endS;

    const row: NormalizedChunk = {
      seq: chunk.seq,
      url: chunk.url,
      startS,
      endS,
      durationS: endS - startS,
      index,
    };
    normalized.push(row);
    seqToIndex.set(chunk.seq, index);
    startTimes.push(startS);
    endTimes.push(endS);
  }

  return {
    chunks: normalized,
    startTimes,
    endTimes,
    seqToIndex,
    totalDurationS: endTimes.length ? endTimes[endTimes.length - 1] : 0,
    isEstimatedTimeline: estimated,
  };
}

function binarySearchTime(startTimes: number[], targetS: number): number {
  if (startTimes.length === 0) return 0;
  let lo = 0;
  let hi = startTimes.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (startTimes[mid] <= targetS) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function buildMimeType(manifest: Manifest): string {
  const mt = manifest.mime_type ?? 'video/webm';
  if (/codecs\s*=/i.test(mt)) return mt;
  if (manifest.codec) return `${mt}; codecs="${manifest.codec}"`;
  return mt;
}

function findSupportedMime(manifest: Manifest): string | null {
  const base = manifest.mime_type || 'video/webm';
  const codec = manifest.codec || '';
  const candidates: string[] = [];

  if (codec) candidates.push(`${base}; codecs="${codec}"`);
  if (!/vp9/i.test(codec)) candidates.push(`${base}; codecs="vp9,opus"`);
  if (!/vp8/i.test(codec)) candidates.push(`${base}; codecs="vp8,opus"`);
  candidates.push(`${base}; codecs="vp9"`);
  candidates.push(`${base}; codecs="vp8"`);
  candidates.push(base);

  for (const mime of candidates) {
    if (MediaSource.isTypeSupported(mime)) return mime;
  }
  return null;
}

async function fetchWithRetry(url: string, retries = MAX_RETRY, signal?: AbortSignal): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      if (attempt === retries - 1) throw err;
      await sleep(250 * (2 ** attempt));
    }
  }
  throw new Error('Unreachable');
}

class ChunkCache {
  private data = new Map<number, ArrayBuffer>();
  private order: number[] = [];
  private _totalBytes = 0;
  private maxBytes: number;

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes;
  }

  get totalBytes() { return this._totalBytes; }
  get size() { return this.data.size; }

  has(seq: number): boolean {
    return this.data.has(seq);
  }

  get(seq: number): ArrayBuffer | undefined {
    const val = this.data.get(seq);
    if (val) this.touch(seq);
    return val;
  }

  set(seq: number, buf: ArrayBuffer): void {
    if (this.data.has(seq)) return;
    this.data.set(seq, buf);
    this.order.push(seq);
    this._totalBytes += buf.byteLength;
    while (this._totalBytes > this.maxBytes && this.order.length > 1) {
      const oldest = this.order.shift();
      if (oldest === undefined) break;
      const removed = this.data.get(oldest);
      this.data.delete(oldest);
      if (removed) this._totalBytes -= removed.byteLength;
    }
  }

  clear() {
    this.data.clear();
    this.order = [];
    this._totalBytes = 0;
  }

  private touch(seq: number) {
    const idx = this.order.indexOf(seq);
    if (idx >= 0) {
      this.order.splice(idx, 1);
      this.order.push(seq);
    }
  }
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
  const cleanupRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [bufferingDebounced, setBufferingDebounced] = useState(false);
  const [seekingUi, setSeekingUi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWithMSE = useCallback(async function loadWithMSEInternal(
    manifest: Manifest,
    onFallback: () => void,
    recoveryAttempt = 0,
    resumeTimeS?: number,
    resumePlaying = false,
  ) {
    const video = videoRef.current;
    if (!video) return;

    cleanupRef.current?.();
    cleanupRef.current = null;

    let destroyed = false;
    let hasError = false;
    let schedulerId: ReturnType<typeof setInterval> | null = null;
    let seekDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let bufferingTimer: ReturnType<typeof setTimeout> | null = null;
    let appendInFlight = false;
    let evictInFlight = false;
    let seekGeneration = 0;
    let fetchController = new AbortController();
    let fetchWorkersRunning = 0;
    let sourceBufferErrorCount = 0;
    let recovering = false;
    let firstChunkAppended = false;
    let resumeAfterSeek = false;
    let pendingSeekTargetSeq: number | null = null;
    let endOfStreamDone = false;
    let bufferAheadS = BUFFER_AHEAD_FAST_S;
    let isUserScrubbing = false;

    const speedSamples: number[] = [];
    const cache = new ChunkCache(MAX_CACHE_BYTES);

    const timeline = normalizeTimeline(manifest.chunks);
    const chunks = timeline.chunks;
    const totalChunks = chunks.length;

    if (totalChunks === 0) {
      setError('No chunks in manifest');
      setLoading(false);
      onErrorCallback?.();
      return;
    }

    // Binary-search helper used by scheduler and seek flow.
    const getSeqForTime = (targetSeconds: number): number => {
      const t = Math.max(0, targetSeconds);
      const idx = binarySearchTime(timeline.startTimes, t);
      return chunks[Math.min(Math.max(idx, 0), chunks.length - 1)].seq;
    };

    const getTimeForSeq = (seq: number): number => {
      const idx = timeline.seqToIndex.get(seq);
      if (idx === undefined) return 0;
      return chunks[idx].startS;
    };

    const getChunkBySeq = (seq: number): NormalizedChunk | null => {
      const idx = timeline.seqToIndex.get(seq);
      if (idx === undefined) return null;
      return chunks[idx];
    };

    const mediaSource = new MediaSource();
    const msUrl = URL.createObjectURL(mediaSource);
    video.src = msUrl;
    await once(mediaSource, 'sourceopen');
    if (destroyed) return;

    const mime = findSupportedMime(manifest) || buildMimeType(manifest);
    let sourceBuffer: SourceBuffer;
    try {
      sourceBuffer = mediaSource.addSourceBuffer(mime);
    } catch {
      URL.revokeObjectURL(msUrl);
      onFallback();
      return;
    }

    const explicitDurationS = (manifest.total_duration_ms ?? 0) / 1000;
    const finalDuration = explicitDurationS > 0 ? explicitDurationS : timeline.totalDurationS;
    if (finalDuration > 0 && isFinite(finalDuration)) {
      try { mediaSource.duration = finalDuration; } catch {}
    }

    if (typeof resumeTimeS === 'number' && resumeTimeS >= 0) {
      try { video.currentTime = resumeTimeS; } catch {}
    }

    const fetchedSeqs = new Set<number>();
    const fetchingSeqs = new Set<number>();
    const appendedSeqs = new Set<number>();
    const failedSeqs = new Set<number>();

    const queuedFetch = new Set<number>();
    const fetchQueueHigh: number[] = [];
    const fetchQueueNormal: number[] = [];
    const fetchQueueLow: number[] = [];

    const queuedAppend = new Set<number>();
    const appendQueueHigh: number[] = [];
    const appendQueueNormal: number[] = [];
    const appendQueueLow: number[] = [];

    const clearBufferingTimer = () => {
      if (bufferingTimer) {
        clearTimeout(bufferingTimer);
        bufferingTimer = null;
      }
    };

    const updateProgress = () => {
      setLoadProgress((fetchedSeqs.size + failedSeqs.size) / totalChunks);
    };

    const estimateSpeed = (bytes: number, ms: number) => {
      if (ms <= 0) return;
      const bps = (bytes / ms) * 1000;
      speedSamples.push(bps);
      if (speedSamples.length > 5) speedSamples.shift();
      const avg = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
      bufferAheadS = avg < SLOW_NETWORK_BPS ? BUFFER_AHEAD_SLOW_S : BUFFER_AHEAD_FAST_S;
    };

    const pickQueue = (priority: Priority, high: number[], normal: number[], low: number[]) => {
      if (priority === 'high') return high;
      if (priority === 'normal') return normal;
      return low;
    };

    const removeFromQueue = (seq: number, q: number[]) => {
      const idx = q.indexOf(seq);
      if (idx >= 0) q.splice(idx, 1);
    };

    const clearNormalAndLowWork = () => {
      fetchQueueNormal.length = 0;
      fetchQueueLow.length = 0;
      appendQueueNormal.length = 0;
      appendQueueLow.length = 0;
    };

    const enqueueFetch = (seq: number, priority: Priority) => {
      if (destroyed) return;
      if (!timeline.seqToIndex.has(seq)) return;
      if (fetchedSeqs.has(seq) || fetchingSeqs.has(seq) || failedSeqs.has(seq)) return;
      if (queuedFetch.has(seq)) {
        if (priority === 'high') {
          removeFromQueue(seq, fetchQueueNormal);
          removeFromQueue(seq, fetchQueueLow);
          if (!fetchQueueHigh.includes(seq)) fetchQueueHigh.push(seq);
        }
        return;
      }
      queuedFetch.add(seq);
      pickQueue(priority, fetchQueueHigh, fetchQueueNormal, fetchQueueLow).push(seq);
    };

    const enqueueAppend = (seq: number, priority: Priority) => {
      if (destroyed) return;
      if (!timeline.seqToIndex.has(seq)) return;
      if (appendedSeqs.has(seq)) return;
      if (queuedAppend.has(seq)) {
        if (priority === 'high') {
          removeFromQueue(seq, appendQueueNormal);
          removeFromQueue(seq, appendQueueLow);
          if (!appendQueueHigh.includes(seq)) appendQueueHigh.push(seq);
        }
        return;
      }
      queuedAppend.add(seq);
      pickQueue(priority, appendQueueHigh, appendQueueNormal, appendQueueLow).push(seq);
    };

    const dequeueFetch = (): { seq: number; priority: Priority } | null => {
      const high = fetchQueueHigh.shift();
      if (typeof high === 'number') {
        queuedFetch.delete(high);
        return { seq: high, priority: 'high' };
      }
      const normal = fetchQueueNormal.shift();
      if (typeof normal === 'number') {
        queuedFetch.delete(normal);
        return { seq: normal, priority: 'normal' };
      }
      const low = fetchQueueLow.shift();
      if (typeof low === 'number') {
        queuedFetch.delete(low);
        return { seq: low, priority: 'low' };
      }
      return null;
    };

    const dequeueAppend = (): number | null => {
      const next = appendQueueHigh.shift() ?? appendQueueNormal.shift() ?? appendQueueLow.shift();
      if (typeof next === 'number') queuedAppend.delete(next);
      return typeof next === 'number' ? next : null;
    };

    const queueEmpty = () =>
      fetchQueueHigh.length === 0 &&
      fetchQueueNormal.length === 0 &&
      fetchQueueLow.length === 0 &&
      appendQueueHigh.length === 0 &&
      appendQueueNormal.length === 0 &&
      appendQueueLow.length === 0 &&
      fetchingSeqs.size === 0 &&
      !appendInFlight;

    const getBufferedEndAt = (timeS: number): number => {
      const ranges = video.buffered;
      for (let i = 0; i < ranges.length; i++) {
        const start = ranges.start(i);
        const end = ranges.end(i);
        if (timeS >= start - 0.05 && timeS <= end + 0.05) return end;
      }
      return timeS;
    };

    const getMaxBufferedEnd = (): number => {
      const ranges = sourceBuffer.buffered;
      if (ranges.length === 0) return 0;
      return ranges.end(ranges.length - 1);
    };

    const waitForSourceIdle = async () => {
      while (!destroyed && sourceBuffer.updating) {
        await once(sourceBuffer, 'updateend');
      }
    };

    const removeBufferedRange = async (start: number, end: number) => {
      if (destroyed || mediaSource.readyState !== 'open') return;
      if (!(end > start)) return;
      await waitForSourceIdle();
      if (destroyed || mediaSource.readyState !== 'open') return;
      await new Promise<void>(resolve => {
        const done = () => {
          sourceBuffer.removeEventListener('updateend', done);
          sourceBuffer.removeEventListener('error', done);
          resolve();
        };
        sourceBuffer.addEventListener('updateend', done, { once: true });
        sourceBuffer.addEventListener('error', done, { once: true });
        try {
          sourceBuffer.remove(start, end);
        } catch {
          done();
        }
      });
    };

    // Sliding-window eviction to avoid QuotaExceededError loops.
    const evictBuffer = async (aggressive = false) => {
      if (destroyed || mediaSource.readyState !== 'open') return;
      const current = video.currentTime;
      const behindLimit = current - (aggressive ? 2 : BUFFER_BEHIND_S);
      const snapshot: Array<{ start: number; end: number }> = [];
      for (let i = 0; i < sourceBuffer.buffered.length; i++) {
        snapshot.push({ start: sourceBuffer.buffered.start(i), end: sourceBuffer.buffered.end(i) });
      }

      for (const range of snapshot) {
        if (range.start < behindLimit) {
          await removeBufferedRange(range.start, Math.min(range.end, behindLimit));
        }
      }

      const farAheadLimit = current + Math.max(PREFETCH_HORIZON_S, bufferAheadS + 60);
      const maxBufferedEnd = getMaxBufferedEnd();
      if (maxBufferedEnd > farAheadLimit) {
        await removeBufferedRange(farAheadLimit, maxBufferedEnd);
      }
    };

    // Seek clear step: keep only a tiny safety window around the target time.
    const clearBufferAroundTarget = async (targetS: number) => {
      if (destroyed || mediaSource.readyState !== 'open') return;
      const keepStart = Math.max(0, targetS - 0.25);
      const keepEnd = targetS + 0.25;

      try {
        if (sourceBuffer.updating) sourceBuffer.abort();
      } catch {}

      const snapshot: Array<{ start: number; end: number }> = [];
      for (let i = 0; i < sourceBuffer.buffered.length; i++) {
        snapshot.push({ start: sourceBuffer.buffered.start(i), end: sourceBuffer.buffered.end(i) });
      }

      for (const range of snapshot) {
        if (range.end <= keepStart || range.start >= keepEnd) {
          await removeBufferedRange(range.start, range.end);
          continue;
        }
        if (range.start < keepStart) {
          await removeBufferedRange(range.start, keepStart);
        }
        if (range.end > keepEnd) {
          await removeBufferedRange(keepEnd, range.end);
        }
      }
    };

    const appendOnce = async (buffer: ArrayBuffer) => {
      await waitForSourceIdle();
      if (destroyed || mediaSource.readyState !== 'open') throw new Error('MSE closed');

      await new Promise<void>((resolve, reject) => {
        const onUpdate = () => {
          sourceBuffer.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          sourceBuffer.removeEventListener('updateend', onUpdate);
          reject(new Error('SourceBuffer error event'));
        };
        sourceBuffer.addEventListener('updateend', onUpdate, { once: true });
        sourceBuffer.addEventListener('error', onError, { once: true });
        try {
          sourceBuffer.appendBuffer(buffer);
        } catch (err) {
          sourceBuffer.removeEventListener('updateend', onUpdate);
          sourceBuffer.removeEventListener('error', onError);
          reject(err);
        }
      });
    };

    const recoverOrFallback = async () => {
      if (destroyed || recovering) return;
      recovering = true;
      const resumeAt = video.currentTime;
      const wasPlaying = !video.paused;
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (recoveryAttempt < 1) {
        await loadWithMSEInternal(manifest, onFallback, recoveryAttempt + 1, resumeAt, wasPlaying);
      } else {
        onFallback();
      }
    };

    const handleSourceBufferFault = async (err: unknown) => {
      sourceBufferErrorCount++;
      console.error('[ChunkedVideoPlayer] SourceBuffer fault:', err, `(count ${sourceBufferErrorCount})`);
      if (sourceBufferErrorCount >= MAX_SB_ERRORS) {
        await recoverOrFallback();
      }
    };

    const finalizeSeekIfReady = async (seq: number) => {
      if (pendingSeekTargetSeq === null || seq !== pendingSeekTargetSeq) return;
      pendingSeekTargetSeq = null;
      isUserScrubbing = false;
      setSeekingUi(false);
      clearBufferingTimer();
      setBufferingDebounced(false);
      if (resumeAfterSeek) {
        resumeAfterSeek = false;
        try { await video.play(); } catch {}
      }
    };

    const fetchChunk = async (seq: number, priority: Priority, gen: number): Promise<void> => {
      if (destroyed) return;
      if (gen !== seekGeneration && priority === 'high') return;
      if (fetchedSeqs.has(seq) || fetchingSeqs.has(seq) || failedSeqs.has(seq)) return;

      const chunk = getChunkBySeq(seq);
      if (!chunk) return;

      fetchingSeqs.add(seq);
      const t0 = performance.now();
      try {
        const data = await fetchWithRetry(chunk.url, MAX_RETRY, fetchController.signal);
        if (destroyed || gen !== seekGeneration) return;
        estimateSpeed(data.byteLength, performance.now() - t0);
        fetchedSeqs.add(seq);
        cache.set(seq, data);
        enqueueAppend(seq, priority);
        updateProgress();
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        failedSeqs.add(seq);
        console.error(`[ChunkedVideoPlayer] Failed chunk ${seq}:`, err);
        updateProgress();
        if (failedSeqs.size > MAX_FAILED_CHUNKS) {
          hasError = true;
          if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
          setError('Failed to load video chunks.');
          setLoading(false);
          onErrorCallback?.();
        }
        if (pendingSeekTargetSeq === seq) {
          isUserScrubbing = false;
          setSeekingUi(false);
        }
      } finally {
        fetchingSeqs.delete(seq);
      }
    };

    const pumpFetchQueue = () => {
      if (destroyed || hasError) return;
      while (fetchWorkersRunning < PREFETCH_CONCURRENCY) {
        const next = dequeueFetch();
        if (!next) break;
        const gen = seekGeneration;
        const seq = next.seq;
        const priority = next.priority;

        fetchWorkersRunning++;
        (async () => {
          try {
            await fetchChunk(seq, priority, gen);
          } finally {
            fetchWorkersRunning--;
            pumpAppendQueue();
            pumpFetchQueue();
          }
        })();
      }
    };

    // Single-writer append queue: never append while SourceBuffer is updating.
    const pumpAppendQueue = () => {
      if (destroyed || appendInFlight || mediaSource.readyState !== 'open') return;
      appendInFlight = true;

      (async () => {
        while (!destroyed) {
          const seq = dequeueAppend();
          if (seq === null) break;
          if (appendedSeqs.has(seq)) continue;

          let data = cache.get(seq);
          if (!data) {
            fetchedSeqs.delete(seq);
            enqueueFetch(seq, 'high');
            continue;
          }

          try {
            await appendOnce(data);
          } catch (err: any) {
            if (err?.name === 'QuotaExceededError') {
              await evictBuffer(true);
              data = cache.get(seq);
              if (!data) {
                fetchedSeqs.delete(seq);
                enqueueFetch(seq, 'high');
                continue;
              }
              try {
                await appendOnce(data);
              } catch (retryErr) {
                await handleSourceBufferFault(retryErr);
                break;
              }
            } else {
              await handleSourceBufferFault(err);
              break;
            }
          }

          appendedSeqs.add(seq);
          if (!firstChunkAppended) {
            firstChunkAppended = true;
            setLoading(false);
            onReady?.();
            if (resumePlaying || autoPlay) {
              try { await video.play(); } catch {}
              resumePlaying = false;
            }
          }

          await finalizeSeekIfReady(seq);
          await evictBuffer(false);
        }
      })()
        .finally(() => {
          appendInFlight = false;
          if (!destroyed && !queueEmpty()) {
            pumpAppendQueue();
          }
        });
    };

    const enqueueWindowByTime = (startS: number, endS: number, priority: Priority) => {
      const from = getSeqForTime(Math.max(0, startS));
      const to = getSeqForTime(Math.max(0, endS));
      const fromIdx = timeline.seqToIndex.get(Math.min(from, to));
      const toIdx = timeline.seqToIndex.get(Math.max(from, to));
      if (fromIdx === undefined || toIdx === undefined) return;
      for (let idx = fromIdx; idx <= toIdx; idx++) {
        enqueueFetch(chunks[idx].seq, priority);
      }
    };

    // Debounced seek flow with cancellation and target-first fetch/append.
    const processSeek = async (targetS: number) => {
      if (destroyed) return;
      isUserScrubbing = true;
      setSeekingUi(true);
      resumeAfterSeek = !video.paused;
      seekGeneration++;
      const gen = seekGeneration;

      try {
        video.currentTime = targetS;
      } catch {}

      fetchController.abort();
      fetchController = new AbortController();
      clearNormalAndLowWork();
      fetchQueueHigh.length = 0;
      appendQueueHigh.length = 0;
      queuedFetch.clear();
      queuedAppend.clear();
      fetchingSeqs.clear();

      await clearBufferAroundTarget(targetS);

      const targetSeq = getSeqForTime(targetS);
      pendingSeekTargetSeq = targetSeq;
      enqueueFetch(targetSeq, 'high');
      enqueueAppend(targetSeq, 'high');

      enqueueWindowByTime(targetS, targetS + SEEK_AHEAD_WINDOW_S, 'normal');
      enqueueWindowByTime(targetS - SEEK_BEHIND_WINDOW_S, targetS, 'low');

      if (cache.has(targetSeq)) {
        enqueueAppend(targetSeq, 'high');
      }

      if (gen === seekGeneration) {
        pumpFetchQueue();
        pumpAppendQueue();
      }
    };

    const onSeeking = () => {
      if (destroyed) return;
      isUserScrubbing = true;
      const targetS = video.currentTime;
      setSeekingUi(true);
      if (seekDebounceTimer) clearTimeout(seekDebounceTimer);
      seekDebounceTimer = setTimeout(() => {
        processSeek(targetS).catch(err => {
          console.error('[ChunkedVideoPlayer] seek processing failed', err);
          setSeekingUi(false);
        });
      }, SEEK_DEBOUNCE_MS);
    };

    const updateBufferingState = () => {
      if (destroyed || !firstChunkAppended) return;
      if (isUserScrubbing || video.paused) {
        clearBufferingTimer();
        setBufferingDebounced(false);
        return;
      }
      const bufferedEnd = getBufferedEndAt(video.currentTime);
      const shouldBuffer = bufferedEnd < video.currentTime + 0.5;
      if (shouldBuffer) {
        if (!bufferingTimer) {
          bufferingTimer = setTimeout(() => {
            if (!destroyed && !isUserScrubbing && !video.paused) {
              setBufferingDebounced(true);
            }
          }, BUFFERING_DEBOUNCE_MS);
        }
      } else {
        clearBufferingTimer();
        setBufferingDebounced(false);
      }
    };

    const schedulerTick = () => {
      if (destroyed || hasError) {
        if (hasError && schedulerId) { clearInterval(schedulerId); schedulerId = null; }
        return;
      }
      updateBufferingState();

      const ct = video.currentTime;
      const bufferedEnd = getBufferedEndAt(ct);
      const needsAhead = bufferedEnd < ct + bufferAheadS;

      if (needsAhead) {
        enqueueWindowByTime(Math.max(ct, bufferedEnd - 0.25), ct + bufferAheadS, 'normal');
      } else if (cache.totalBytes < MAX_CACHE_BYTES) {
        const prefetchStart = Math.max(bufferedEnd, ct + bufferAheadS);
        const prefetchEnd = ct + PREFETCH_HORIZON_S;
        enqueueWindowByTime(prefetchStart, prefetchEnd, 'low');
      }

      pumpFetchQueue();
      pumpAppendQueue();

      if (!evictInFlight) {
        evictInFlight = true;
        evictBuffer(false).finally(() => {
          evictInFlight = false;
        });
      }

      if (!endOfStreamDone) {
        const terminalCount = appendedSeqs.size + failedSeqs.size;
        if (terminalCount >= totalChunks && queueEmpty() && !sourceBuffer.updating && mediaSource.readyState === 'open') {
          try {
            mediaSource.endOfStream();
            endOfStreamDone = true;
          } catch {}
        }
      }
    };

    const onPlayOrCanPlay = () => {
      clearBufferingTimer();
      setBufferingDebounced(false);
    };

    video.addEventListener('seeking', onSeeking);
    video.addEventListener('playing', onPlayOrCanPlay);
    video.addEventListener('canplay', onPlayOrCanPlay);
    video.addEventListener('pause', onPlayOrCanPlay);

    const initialTime = typeof resumeTimeS === 'number' ? resumeTimeS : video.currentTime;
    const initialSeq = getSeqForTime(initialTime);
    pendingSeekTargetSeq = initialSeq;
    enqueueFetch(initialSeq, 'high');
    enqueueAppend(initialSeq, 'high');
    enqueueWindowByTime(initialTime, initialTime + SEEK_AHEAD_WINDOW_S, 'normal');
    pumpFetchQueue();
    pumpAppendQueue();

    schedulerId = setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);

    cleanupRef.current = () => {
      destroyed = true;
      fetchController.abort();
      if (schedulerId) clearInterval(schedulerId);
      if (seekDebounceTimer) clearTimeout(seekDebounceTimer);
      clearBufferingTimer();
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('playing', onPlayOrCanPlay);
      video.removeEventListener('canplay', onPlayOrCanPlay);
      video.removeEventListener('pause', onPlayOrCanPlay);
      cache.clear();
      URL.revokeObjectURL(msUrl);
      try { video.src = ''; } catch {}
    };

    if (timeline.isEstimatedTimeline) {
      console.warn('[ChunkedVideoPlayer] Manifest timeline estimated from duration fallback.');
    }
    console.log('[ChunkedVideoPlayer] Timeline ready. total chunks:', totalChunks, 'duration:', timeline.totalDurationS, 'first time:', getTimeForSeq(chunks[0].seq));
  }, [autoPlay, onErrorCallback, onReady]);

  const loadWithBlob = useCallback(async (manifest: Manifest) => {
    const video = videoRef.current;
    if (!video) return;

    cleanupRef.current?.();
    cleanupRef.current = null;

    setLoading(true);
    setLoadProgress(0);
    setBufferingDebounced(false);
    setSeekingUi(false);

    const mimeType = manifest.mime_type || 'video/webm';
    const sorted = [...manifest.chunks].sort((a, b) => a.seq - b.seq);
    const allBuffers: ArrayBuffer[] = [];
    let partialUrl: string | null = null;

    for (let i = 0; i < sorted.length; i++) {
      if (abortRef.current?.signal.aborted) return;
      const data = await fetchWithRetry(sorted[i].url, MAX_RETRY, abortRef.current?.signal);
      allBuffers.push(data);
      setLoadProgress((i + 1) / sorted.length);

      if (i === 0) {
        const partialBlob = new Blob([data], { type: mimeType });
        partialUrl = URL.createObjectURL(partialBlob);
        video.src = partialUrl;
        video.load();
        setLoading(false);
        onReady?.();
      }
    }

    const currentTime = video.currentTime;
    const wasPaused = video.paused;
    if (partialUrl) URL.revokeObjectURL(partialUrl);

    const fullBlob = new Blob(allBuffers.map(b => new Blob([b])), { type: mimeType });
    const fullUrl = URL.createObjectURL(fullBlob);
    video.src = fullUrl;
    video.load();

    video.addEventListener('loadedmetadata', () => {
      if (currentTime > 0) video.currentTime = currentTime;
      if (!wasPaused) {
        video.play().catch(() => {});
      }
    }, { once: true });

    cleanupRef.current = () => URL.revokeObjectURL(fullUrl);
  }, [onReady]);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadProgress(0);
    setBufferingDebounced(false);
    setSeekingUi(false);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const normalizedManifestUrl = normalizeR2Url(manifestUrl);
      const res = await fetch(normalizedManifestUrl, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);

      const manifest: Manifest = await res.json();
      if (!manifest.chunks?.length) throw new Error('No chunks in manifest');

      manifest.chunks = manifest.chunks
        .map(c => ({ ...c, url: normalizeR2Url(c.url) }))
        .sort((a, b) => a.seq - b.seq);

      const supportedMime = typeof MediaSource !== 'undefined' ? findSupportedMime(manifest) : null;
      if (supportedMime) {
        await loadWithMSE(manifest, () => {
          console.warn('[ChunkedVideoPlayer] MSE fallback to blob');
          loadWithBlob(manifest).catch(err => {
            console.error('[ChunkedVideoPlayer] Blob fallback failed:', err);
            setError('Failed to load video.');
            setLoading(false);
            onErrorCallback?.();
          });
        });
      } else {
        await loadWithBlob(manifest);
      }
    } catch (err: any) {
      if (abortRef.current?.signal.aborted) return;
      setError(err?.message || 'Failed to load video');
      setLoading(false);
      onErrorCallback?.();
    }
  }, [loadWithBlob, loadWithMSE, manifestUrl, onErrorCallback]);

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
      <div className={`flex flex-col items-center justify-center gap-3 bg-black/90 text-white/70 text-sm p-4 ${className}`}>
        <span>Warning: {error}</span>
        <button
          onClick={() => {
            setError(null);
            start();
          }}
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <SocialVideoPlayer
      videoRef={videoRef as RefObject<HTMLVideoElement>}
      showControls={controls}
      className={className}
    >
      <div className="relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            <span className="text-white/60 text-sm">Loading video...</span>
            <div className="w-3/4 max-w-xs">
              <Progress value={loadProgress * 100} className="h-1.5 bg-white/20" />
            </div>
            <span className="text-white/40 text-xs">{Math.round(loadProgress * 100)}%</span>
          </div>
        )}

        {!loading && loadProgress > 0 && loadProgress < 1 && (
          <div className="absolute top-0 left-0 right-0 z-10">
            <Progress value={loadProgress * 100} className="h-1 bg-white/10 rounded-none" />
          </div>
        )}

        {!loading && seekingUi && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Seeking...</span>
            </div>
          </div>
        )}

        {!loading && !seekingUi && bufferingDebounced && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Buffering...</span>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          preload="metadata"
          className="w-full h-full object-contain"
        />
      </div>
    </SocialVideoPlayer>
  );
}

export default ChunkedVideoPlayer;
