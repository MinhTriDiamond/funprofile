/**
 * Chunk Upload Queue
 * Manages concurrent uploads with retry, pause/resume, and online/offline awareness
 */

export interface ChunkJob {
  seq: number;
  blob: Blob;
  recordingId: string;
  retries: number;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  objectKey?: string;
}

export interface ChunkUploadQueueOptions {
  maxConcurrent?: number;
  maxRetries?: number;
  getAccessToken: () => Promise<string>;
  onChunkUploaded?: (job: ChunkJob) => void;
  onChunkFailed?: (job: ChunkJob, error: Error) => void;
  onQueueProgress?: (uploaded: number, total: number) => void;
}

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

export class ChunkUploadQueue {
  private queue: ChunkJob[] = [];
  private activeCount = 0;
  private maxConcurrent: number;
  private maxRetries: number;
  private isPaused = false;
  private isOnline = true;
  private options: ChunkUploadQueueOptions;
  private totalEnqueued = 0;
  private totalUploaded = 0;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(options: ChunkUploadQueueOptions) {
    this.options = options;
    this.maxConcurrent = options.maxConcurrent ?? 2;
    this.maxRetries = options.maxRetries ?? 3;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    this.onlineHandler = () => {
      this.isOnline = true;
      console.log('[ChunkQueue] Online — resuming');
      this.processQueue();
    };
    this.offlineHandler = () => {
      this.isOnline = false;
      console.log('[ChunkQueue] Offline — pausing');
    };
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        console.log('[ChunkQueue] Visible — processing');
        this.processQueue();
      }
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.isOnline = navigator.onLine;
  }

  enqueue(job: Omit<ChunkJob, 'retries' | 'status'>): void {
    this.queue.push({ ...job, retries: 0, status: 'queued' });
    this.totalEnqueued++;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isPaused || !this.isOnline) return;

    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.find(j => j.status === 'queued');
      if (!job) break;

      job.status = 'uploading';
      this.activeCount++;
      this.uploadChunk(job).finally(() => {
        this.activeCount--;
        this.processQueue();
      });
    }
  }

  private async uploadChunk(job: ChunkJob): Promise<void> {
    try {
      const token = await this.options.getAccessToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // 1. Get signed URL
      const signedRes = await fetch(`${supabaseUrl}/functions/v1/r2-signed-chunk-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          recording_id: job.recordingId,
          seq: job.seq,
          contentType: job.blob.type || 'video/webm',
          fileSize: job.blob.size,
        }),
      });

      if (!signedRes.ok) {
        const err = await signedRes.json().catch(() => ({}));
        throw new Error(err.error || `Signed URL failed: ${signedRes.status}`);
      }

      const { uploadUrl, objectKey } = await signedRes.json();
      job.objectKey = objectKey;

      // 2. PUT chunk to R2
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': job.blob.type || 'video/webm',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: job.blob,
      });

      if (!putRes.ok) {
        throw new Error(`PUT failed: ${putRes.status}`);
      }

      // 3. Update DB
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Upsert chunk record
      await (supabase as any).from('chunked_recording_chunks')
        .upsert({
          recording_id: job.recordingId,
          seq: job.seq,
          object_key: objectKey,
          bytes: job.blob.size,
          duration_ms: 4000, // approximate
          status: 'uploaded',
          uploaded_at: new Date().toISOString(),
        }, { onConflict: 'recording_id,seq' });

      // Update checkpoint
      await (supabase as any).from('chunked_recordings')
        .update({ last_seq_uploaded: job.seq })
        .eq('id', job.recordingId)
        .gte('last_seq_uploaded', -1); // Only if our seq is newer (handled by trigger ideally)

      job.status = 'uploaded';
      this.totalUploaded++;
      this.options.onChunkUploaded?.(job);
      this.options.onQueueProgress?.(this.totalUploaded, this.totalEnqueued);

    } catch (error: any) {
      job.retries++;
      if (job.retries <= this.maxRetries) {
        job.status = 'queued';
        const delay = RETRY_DELAYS[Math.min(job.retries - 1, RETRY_DELAYS.length - 1)];
        console.warn(`[ChunkQueue] Retry ${job.retries}/${this.maxRetries} for seq ${job.seq} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        // Re-queue will happen on next processQueue cycle
      } else {
        job.status = 'failed';
        const idx = this.queue.indexOf(job);
        if (idx >= 0) this.queue.splice(idx, 1);
        this.options.onChunkFailed?.(job, error);
        this.options.onQueueProgress?.(this.totalUploaded, this.totalEnqueued);
      }
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.processQueue();
  }

  getStats(): { queued: number; uploading: number; uploaded: number; failed: number; total: number } {
    const queued = this.queue.filter(j => j.status === 'queued').length;
    const uploading = this.queue.filter(j => j.status === 'uploading').length;
    return {
      queued,
      uploading,
      uploaded: this.totalUploaded,
      failed: this.queue.filter(j => j.status === 'failed').length,
      total: this.totalEnqueued,
    };
  }

  /** Wait for all queued/uploading items to finish */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const pending = this.queue.filter(j => j.status === 'queued' || j.status === 'uploading');
        if (pending.length === 0) {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  destroy(): void {
    if (typeof window === 'undefined') return;
    if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
    if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.queue = [];
  }
}
