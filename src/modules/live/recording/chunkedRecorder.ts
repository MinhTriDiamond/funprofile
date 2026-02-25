/**
 * ChunkedRecordingManager
 * Records MediaStream in small chunks (default 4s) and uploads each immediately
 * Supports resume after page reload or network loss
 */

import { supabase } from '@/integrations/supabase/client';
import { ChunkUploadQueue } from './chunkUploadQueue';

const MIME_CANDIDATES = ['video/webm;codecs=vp8,opus', 'video/webm'];
const STORAGE_KEY = 'chunked_recording_id';
const DEFAULT_CHUNK_DURATION_MS = 4000;

export type ChunkedRecordingStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'finalizing'
  | 'done'
  | 'failed';

export interface ChunkedRecorderEvents {
  onStatusChange?: (status: ChunkedRecordingStatus) => void;
  onProgress?: (uploaded: number, total: number) => void;
  onError?: (error: string) => void;
}

function resolveMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder not supported');
  }
  for (const mt of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  throw new Error('No supported recording MIME type');
}

export class ChunkedRecordingManager {
  private recordingId: string | null = null;
  private liveSessionId: string | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private uploadQueue: ChunkUploadQueue | null = null;
  private seq = 0;
  private status: ChunkedRecordingStatus = 'idle';
  private events: ChunkedRecorderEvents;
  private mimeType: string = 'video/webm';
  private chunkDurationMs: number;

  constructor(events: ChunkedRecorderEvents = {}, chunkDurationMs = DEFAULT_CHUNK_DURATION_MS) {
    this.events = events;
    this.chunkDurationMs = Math.max(2000, Math.min(6000, chunkDurationMs));
  }

  private setStatus(s: ChunkedRecordingStatus): void {
    this.status = s;
    this.events.onStatusChange?.(s);
  }

  getStatus(): ChunkedRecordingStatus {
    return this.status;
  }

  getRecordingId(): string | null {
    return this.recordingId;
  }

  private async getAccessToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return session.access_token;
  }

  /**
   * Start recording from a MediaStream
   */
  async start(stream: MediaStream, liveSessionId: string): Promise<void> {
    this.mimeType = resolveMimeType();
    this.liveSessionId = liveSessionId;
    this.seq = 0;

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    // Create recording row in DB
    const { data, error } = await (supabase as any)
      .from('chunked_recordings')
      .insert({
        user_id: session.user.id,
        live_session_id: liveSessionId,
        status: 'recording',
        codec: this.mimeType.includes('vp8') ? 'vp8,opus' : 'webm',
        mime_type: this.mimeType,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create recording');

    this.recordingId = data.id;

    // Persist for resume
    try { localStorage.setItem(STORAGE_KEY, this.recordingId); } catch {}

    // Create upload queue
    this.uploadQueue = new ChunkUploadQueue({
      maxConcurrent: 2,
      maxRetries: 3,
      getAccessToken: () => this.getAccessToken(),
      onChunkUploaded: () => {
        const stats = this.uploadQueue?.getStats();
        if (stats) this.events.onProgress?.(stats.uploaded, stats.total);
      },
      onChunkFailed: (_job, err) => {
        console.error('[ChunkedRecorder] Chunk failed:', err);
      },
      onQueueProgress: (uploaded, total) => {
        this.events.onProgress?.(uploaded, total);
      },
    });

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mimeType });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data || event.data.size === 0 || !this.recordingId || !this.uploadQueue) return;

      const currentSeq = this.seq++;
      this.uploadQueue.enqueue({
        seq: currentSeq,
        blob: event.data,
        recordingId: this.recordingId,
      });
    };

    this.mediaRecorder.onerror = () => {
      this.setStatus('failed');
      this.events.onError?.('MediaRecorder error');
    };

    this.mediaRecorder.start(this.chunkDurationMs);
    this.setStatus('recording');
  }

  /**
   * Resume uploading for an existing recording (after page reload)
   */
  async resume(recordingId: string): Promise<void> {
    this.recordingId = recordingId;

    // Query DB for last checkpoint
    const { data } = await (supabase as any)
      .from('chunked_recordings')
      .select('last_seq_uploaded, status, live_session_id')
      .eq('id', recordingId)
      .maybeSingle();

    if (!data) throw new Error('Recording not found');

    this.liveSessionId = data.live_session_id;
    this.seq = (data.last_seq_uploaded ?? -1) + 1;
    this.setStatus('uploading');

    // Note: In resume mode, we can't restart MediaRecorder
    // This is mainly for flushing pending chunks from localStorage
    // Full resume with new recording requires calling start() again
  }

  /**
   * Stop recording and flush all pending uploads
   */
  async stop(): Promise<{ recordingId: string; manifestUrl?: string }> {
    if (!this.recordingId) throw new Error('No active recording');

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        this.mediaRecorder!.onstop = () => resolve();
        this.mediaRecorder!.stop();
      });
    }

    this.setStatus('uploading');

    // Flush remaining uploads
    if (this.uploadQueue) {
      await this.uploadQueue.flush();
    }

    // Update recording status
    await (supabase as any)
      .from('chunked_recordings')
      .update({ status: 'uploading', total_chunks: this.seq })
      .eq('id', this.recordingId);

    // Call finalize edge function
    this.setStatus('finalizing');
    try {
      const token = await this.getAccessToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/recording-finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          recording_id: this.recordingId,
          live_session_id: this.liveSessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Finalize failed: ${res.status}`);
      }

      const result = await res.json();
      this.setStatus('done');

      // Clear localStorage
      try { localStorage.removeItem(STORAGE_KEY); } catch {}

      return { recordingId: this.recordingId, manifestUrl: result.manifest_url };
    } catch (error: any) {
      this.setStatus('failed');
      this.events.onError?.(error.message || 'Finalize failed');

      // Still update DB
      await (supabase as any)
        .from('chunked_recordings')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', this.recordingId);

      return { recordingId: this.recordingId };
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.uploadQueue?.destroy();
    this.mediaRecorder = null;
    this.uploadQueue = null;
  }

  /**
   * Check if there's a pending recording to resume
   */
  static getPendingRecordingId(): string | null {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  /**
   * Clear pending recording
   */
  static clearPending(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}
