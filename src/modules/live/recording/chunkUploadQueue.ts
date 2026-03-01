/**
 * Progressive chunk upload queue with retry and offline awareness.
 * Chunks are uploaded to R2 via presigned URL or direct upload.
 */

import type { ChunkMeta } from './chunkedRecorder';

export interface ChunkUploadQueueOptions {
  sessionId: string;
  maxRetries?: number;
  onProgress?: (uploaded: number, total: number) => void;
  onError?: (error: Error, chunk: ChunkMeta) => void;
  uploadFn: (chunk: ChunkMeta, sessionId: string) => Promise<string>;
}

interface QueueItem {
  chunk: ChunkMeta;
  retries: number;
  url?: string;
}

export interface ChunkUploadQueueController {
  enqueue: (chunk: ChunkMeta) => void;
  flush: () => Promise<string[]>;
  getUploadedUrls: () => string[];
  getStats: () => { total: number; uploaded: number; failed: number };
}

export function createChunkUploadQueue(options: ChunkUploadQueueOptions): ChunkUploadQueueController {
  const {
    sessionId,
    maxRetries = 3,
    onProgress,
    onError,
    uploadFn,
  } = options;

  const queue: QueueItem[] = [];
  const uploadedUrls: string[] = [];
  let totalEnqueued = 0;
  let totalUploaded = 0;
  let totalFailed = 0;
  let processing = false;

  async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
      // If offline, wait
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            window.removeEventListener('online', handler);
            resolve();
          };
          window.addEventListener('online', handler);
        });
      }

      const item = queue[0];
      try {
        const url = await uploadFn(item.chunk, sessionId);
        item.url = url;
        uploadedUrls.push(url);
        totalUploaded++;
        queue.shift();
        onProgress?.(totalUploaded, totalEnqueued);
      } catch (err) {
        item.retries++;
        if (item.retries >= maxRetries) {
          totalFailed++;
          queue.shift();
          onError?.(err instanceof Error ? err : new Error(String(err)), item.chunk);
        } else {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, item.retries - 1)));
        }
      }
    }

    processing = false;
  }

  function enqueue(chunk: ChunkMeta) {
    totalEnqueued++;
    queue.push({ chunk, retries: 0 });
    processQueue();
  }

  async function flush(): Promise<string[]> {
    // Wait for queue to drain
    while (queue.length > 0 || processing) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return [...uploadedUrls];
  }

  return {
    enqueue,
    flush,
    getUploadedUrls: () => [...uploadedUrls],
    getStats: () => ({ total: totalEnqueued, uploaded: totalUploaded, failed: totalFailed }),
  };
}
