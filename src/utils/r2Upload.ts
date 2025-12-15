import { supabase } from '@/integrations/supabase/client';

export interface R2UploadResult {
  url: string;
  key: string;
}

/**
 * Upload file directly to Cloudflare R2 via edge function
 */
export async function uploadToR2(
  file: File,
  bucket: 'posts' | 'avatars' | 'videos' | 'comment-media',
  customPath?: string
): Promise<R2UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = customPath || `${timestamp}-${randomString}.${extension}`;
    const key = `${bucket}/${filename}`;

    // Convert file to base64 in chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Process in 8KB chunks to avoid Maximum call stack size exceeded
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    // Call edge function to upload to R2
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: {
        file: base64,
        key: key,
        contentType: file.type,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No URL returned from R2 upload');

    return {
      url: data.url,
      key: key,
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
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
    console.error('Error deleting from R2:', error);
    throw error;
  }
}
