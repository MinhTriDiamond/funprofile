import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

export interface StreamUploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
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

/**
 * Get a direct upload URL from Cloudflare Stream
 */
async function getDirectUploadUrl(): Promise<{ uploadUrl: string; uid: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('stream-video', {
    body: { maxDurationSeconds: 300 },
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  // Check for the query param in URL
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=direct-upload`;
  
  const directResponse = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ maxDurationSeconds: 300 }),
  });

  if (!directResponse.ok) {
    const error = await directResponse.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to get upload URL');
  }

  return directResponse.json();
}

/**
 * Upload a video to Cloudflare Stream using TUS protocol
 * Supports resumable uploads with progress tracking
 */
export async function uploadToStream(
  file: File,
  onProgress?: (progress: StreamUploadProgress) => void,
  onError?: (error: Error) => void
): Promise<StreamUploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get upload URL from our edge function
      const { uploadUrl, uid } = await getDirectUploadUrl();

      console.log('[streamUpload] Starting upload:', { uid, size: file.size });

      // Upload directly to the provided URL
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            bytesUploaded: event.loaded,
            bytesTotal: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[streamUpload] Upload complete:', uid);
          resolve({
            uid,
            playbackUrl: `https://customer-${uid}.cloudflarestream.com/${uid}/manifest/video.m3u8`,
          });
        } else {
          const error = new Error(`Upload failed: ${xhr.status}`);
          onError?.(error);
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Upload failed');
        onError?.(error);
        reject(error);
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);

    } catch (error) {
      console.error('[streamUpload] Error:', error);
      onError?.(error as Error);
      reject(error);
    }
  });
}

/**
 * Upload using TUS protocol for resumable uploads
 */
export async function uploadToStreamTus(
  file: File,
  onProgress?: (progress: StreamUploadProgress) => void,
  onError?: (error: Error) => void
): Promise<StreamUploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Get TUS upload URL
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-video?action=get-upload-url`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxDurationSeconds: 300 }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, uid } = await response.json();

      if (!uploadUrl) {
        // Fallback to direct upload
        return resolve(await uploadToStream(file, onProgress, onError));
      }

      console.log('[streamUpload] Starting TUS upload:', { uid, size: file.size });

      const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        retryDelays: [0, 1000, 3000, 5000],
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('[streamUpload] TUS error:', error);
          onError?.(error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          onProgress?.({
            bytesUploaded,
            bytesTotal,
            percentage: Math.round((bytesUploaded / bytesTotal) * 100),
          });
        },
        onSuccess: () => {
          console.log('[streamUpload] TUS upload complete:', uid);
          resolve({
            uid,
            playbackUrl: `https://customer-${uid}.cloudflarestream.com/${uid}/manifest/video.m3u8`,
          });
        },
      });

      // Check for previous uploads and resume
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });

    } catch (error) {
      console.error('[streamUpload] Error:', error);
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
  // Match patterns like: https://customer-xxx.cloudflarestream.com/{uid}/...
  // Or: https://videodelivery.net/{uid}/...
  const patterns = [
    /cloudflarestream\.com\/([a-f0-9]+)/i,
    /videodelivery\.net\/([a-f0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
