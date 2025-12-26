import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { FILE_LIMITS } from './imageCompression';

export interface StreamUploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  // Enhanced progress info
  uploadSpeed?: number; // bytes per second
  eta?: number; // estimated seconds remaining
}

export interface StreamUploadResult {
  uid: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
}

export interface StreamVideoStatus {
  uid: string;
  status: {
    state: string;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  readyToStream: boolean;
  duration?: number;
  thumbnail?: string;
  playback?: {
    hls?: string;
    dash?: string;
  };
  preview?: string;
}

// Max duration in seconds (15 minutes)
const MAX_DURATION_SECONDS = 900;

/**
 * Get a direct upload URL from Cloudflare Stream
 */
async function getDirectUploadUrl(): Promise<{ uploadUrl: string; uid: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Not authenticated');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=direct-upload`;
  
  console.log('[streamUpload] Getting direct upload URL...');
  
  const directResponse = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ maxDurationSeconds: MAX_DURATION_SECONDS }),
  });

  if (!directResponse.ok) {
    const error = await directResponse.json().catch(() => ({ error: 'Upload failed' }));
    console.error('[streamUpload] Failed to get direct upload URL:', error);
    throw new Error(error.error || 'Failed to get upload URL');
  }

  const result = await directResponse.json();
  console.log('[streamUpload] Got direct upload URL, uid:', result.uid);
  return result;
}

/**
 * Get TUS upload URL for resumable uploads
 */
async function getTusUploadUrl(fileSize: number): Promise<{ uploadUrl: string; uid: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Not authenticated');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=get-upload-url`;
  
  console.log('[streamUpload] Getting TUS upload URL for file size:', formatBytes(fileSize));

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      maxDurationSeconds: MAX_DURATION_SECONDS,
      fileSize,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get TUS URL' }));
    console.error('[streamUpload] Failed to get TUS upload URL:', error);
    throw new Error(error.error || 'Failed to get TUS upload URL');
  }

  const result = await response.json();
  console.log('[streamUpload] Got TUS upload URL:', result.uploadUrl, 'uid:', result.uid);
  return result;
}

/**
 * Upload a video to Cloudflare Stream
 * Uses Direct Upload for all files (more reliable than TUS for our use case)
 */
export async function uploadToStream(
  file: File,
  onProgress?: (progress: StreamUploadProgress) => void,
  onError?: (error: Error) => void
): Promise<StreamUploadResult> {
  const fileSize = file.size;
  const useTus = fileSize > (FILE_LIMITS.TUS_THRESHOLD || 100 * 1024 * 1024);
  
  console.log('[streamUpload] Starting upload:', {
    fileName: file.name,
    fileSize: formatBytes(fileSize),
    useTus,
  });

  if (useTus) {
    console.log('[streamUpload] Using TUS for large file');
    return uploadToStreamTus(file, onProgress, onError);
  }

  return uploadDirect(file, onProgress, onError);
}

/**
 * Direct upload using XHR (for files < 100MB)
 */
async function uploadDirect(
  file: File,
  onProgress?: (progress: StreamUploadProgress) => void,
  onError?: (error: Error) => void
): Promise<StreamUploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const { uploadUrl, uid } = await getDirectUploadUrl();

      console.log('[streamUpload] Starting direct upload to:', uploadUrl);

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000; // seconds
          const bytesDelta = event.loaded - lastLoaded;
          
          // Calculate speed (bytes/sec) with smoothing
          const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
          const remaining = event.total - event.loaded;
          const eta = speed > 0 ? remaining / speed : 0;
          
          lastLoaded = event.loaded;
          lastTime = now;
          
          onProgress({
            bytesUploaded: event.loaded,
            bytesTotal: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            uploadSpeed: speed,
            eta: Math.round(eta),
          });
        }
      });

      xhr.addEventListener('load', () => {
        console.log('[streamUpload] XHR load event, status:', xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[streamUpload] Direct upload complete, uid:', uid);
          resolve({
            uid,
            playbackUrl: `https://iframe.videodelivery.net/${uid}`,
          });
        } else {
          const error = new Error(`Upload failed with status: ${xhr.status}`);
          console.error('[streamUpload] Upload failed:', xhr.status, xhr.responseText);
          onError?.(error);
          reject(error);
        }
      });

      xhr.addEventListener('error', (event) => {
        console.error('[streamUpload] XHR error event:', event);
        const error = new Error('Upload failed - network error');
        onError?.(error);
        reject(error);
      });

      xhr.addEventListener('abort', () => {
        console.error('[streamUpload] Upload aborted');
        const error = new Error('Upload aborted');
        onError?.(error);
        reject(error);
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);

    } catch (error) {
      console.error('[streamUpload] Direct upload error:', error);
      onError?.(error as Error);
      reject(error);
    }
  });
}

/**
 * Upload using TUS protocol for resumable uploads (for files >= 100MB)
 */
export async function uploadToStreamTus(
  file: File,
  onProgress?: (progress: StreamUploadProgress) => void,
  onError?: (error: Error) => void
): Promise<StreamUploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get TUS upload URL from edge function
      const { uploadUrl, uid } = await getTusUploadUrl(file.size);

      if (!uploadUrl) {
        console.log('[streamUpload] No TUS URL received, falling back to direct upload');
        return resolve(await uploadDirect(file, onProgress, onError));
      }

      console.log('[streamUpload] Starting TUS upload:', { 
        uploadUrl, 
        uid, 
        size: formatBytes(file.size) 
      });

      let lastLoaded = 0;
      let lastTime = Date.now();

      const upload = new tus.Upload(file, {
        uploadUrl, // Use the pre-created upload URL
        retryDelays: [0, 1000, 3000, 5000, 10000, 15000, 30000], // More retries for large files
        chunkSize: 50 * 1024 * 1024, // 50MB chunks (Cloudflare recommends 5-200MB)
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('[streamUpload] TUS upload error:', error);
          onError?.(error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          const bytesDelta = bytesUploaded - lastLoaded;
          
          const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
          const remaining = bytesTotal - bytesUploaded;
          const eta = speed > 0 ? remaining / speed : 0;
          
          lastLoaded = bytesUploaded;
          lastTime = now;
          
          const progress = {
            bytesUploaded,
            bytesTotal,
            percentage: Math.round((bytesUploaded / bytesTotal) * 100),
            uploadSpeed: speed,
            eta: Math.round(eta),
          };
          
          console.log('[streamUpload] TUS progress:', progress.percentage + '%', formatBytes(speed) + '/s');
          onProgress?.(progress);
        },
        onSuccess: () => {
          console.log('[streamUpload] TUS upload complete, uid:', uid);
          resolve({
            uid,
            playbackUrl: `https://iframe.videodelivery.net/${uid}`,
          });
        },
      });

      // Check for previous uploads and resume if available
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          console.log('[streamUpload] Found previous upload, resuming...');
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        console.log('[streamUpload] Starting TUS upload...');
        upload.start();
      });

    } catch (error) {
      console.error('[streamUpload] TUS setup error:', error);
      onError?.(error as Error);
      reject(error);
    }
  });
}

/**
 * Check video processing status
 */
export async function checkVideoStatus(uid: string): Promise<StreamVideoStatus> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Not authenticated');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=check-status`;
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid }),
  });

  if (!response.ok) {
    throw new Error('Failed to check video status');
  }

  return response.json();
}

/**
 * Get playback URLs for a video
 */
export async function getPlaybackUrl(uid: string): Promise<{
  hls?: string;
  dash?: string;
  thumbnail?: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Not authenticated');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=get-playback-url`;
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid }),
  });

  if (!response.ok) {
    throw new Error('Failed to get playback URL');
  }

  const data = await response.json();
  return {
    hls: data.playback?.hls,
    dash: data.playback?.dash,
    thumbnail: data.thumbnail,
  };
}

/**
 * Poll for video to be ready
 */
export async function waitForVideoReady(
  uid: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<StreamVideoStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkVideoStatus(uid);
    
    if (status.readyToStream) {
      return status;
    }

    if (status.status?.state === 'error') {
      throw new Error(status.status.errorReasonText || 'Video processing failed');
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video processing timeout');
}

/**
 * Check if a URL is a Cloudflare Stream URL
 */
export function isStreamUrl(url: string): boolean {
  return url.includes('cloudflarestream.com') || url.includes('videodelivery.net');
}

/**
 * Extract stream UID from URL
 */
export function extractStreamUid(url: string): string | null {
  const patterns = [
    /cloudflarestream\.com\/([a-f0-9]+)/i,
    /videodelivery\.net\/([a-f0-9]+)/i,
    /iframe\.videodelivery\.net\/([a-f0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format seconds to human readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
