import { supabase } from '@/integrations/supabase/client';
import { multipartUploadToR2 } from './multipartUpload';

export interface R2UploadResult {
  url: string;
  key: string;
}

/**
 * Get presigned URL from edge function with timeout
 */
async function getPresignedUrl(
  key: string,
  contentType: string,
  fileSize: number,
  accessToken?: string,
  timeoutMs: number = 30000
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Use provided token or get fresh one
    let token = accessToken;
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Chưa đăng nhập');
      }
      token = session.access_token;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/get-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ key, contentType, fileSize }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.uploadUrl || !data.publicUrl) {
      throw new Error('Invalid response from server');
    }

    return { uploadUrl: data.uploadUrl, publicUrl: data.publicUrl };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload file directly to R2 using presigned URL
 */
async function uploadWithPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
  timeoutMs: number = 120000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutId = setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timed out'));
    }, timeoutMs);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      clearTimeout(timeoutId);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Upload network error'));
    };

    xhr.onabort = () => {
      clearTimeout(timeoutId);
      reject(new Error('Upload aborted'));
    };

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000, immutable');
    xhr.send(file);
  });
}

/**
 * Upload file directly to Cloudflare R2 via presigned URL
 * Much more efficient than base64 - supports large files
 * @param accessToken Optional access token to avoid multiple getSession calls
 */
const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB

export async function uploadToR2(
  file: File,
  bucket: 'posts' | 'avatars' | 'videos' | 'comment-media',
  customPath?: string,
  accessToken?: string,
  onProgress?: (percent: number) => void
): Promise<R2UploadResult> {
  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop();
  const filename = customPath || `${timestamp}-${randomString}.${extension}`;
  const key = `${bucket}/${filename}`;

  // Get access token if not provided
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Chưa đăng nhập');
    }
    token = session.access_token;
  }

  // Use multipart upload for large files
  if (file.size >= MULTIPART_THRESHOLD) {
    return await multipartUploadToR2(file, {
      key,
      contentType: file.type,
      accessToken: token,
      onProgress,
    });
  }

  // Single presigned URL upload for smaller files
  const { uploadUrl, publicUrl } = await getPresignedUrl(
    key,
    file.type,
    file.size,
    token,
    45000
  );

  await uploadWithPresignedUrl(
    file,
    uploadUrl,
    onProgress,
    180000
  );

  return {
    url: publicUrl,
    key: key,
  };
}

/**
 * Delete file from Cloudflare R2 via edge function
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('delete-from-r2', {
      body: { key },
    });

    if (error) throw error;
  } catch (error) {
    throw error;
  }
}
