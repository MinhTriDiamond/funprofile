import { supabase } from '@/integrations/supabase/client';
import type { R2UploadResult } from './r2Upload';

const PART_SIZE = 10 * 1024 * 1024; // 10MB per part
const MAX_CONCURRENT = 3; // Upload 3 parts at a time
const MAX_RETRIES = 3;

interface MultipartConfig {
  key: string;
  contentType: string;
  accessToken: string;
  onProgress?: (percent: number) => void;
}

/**
 * Call multipart-upload edge function
 */
async function callMultipartAction(
  action: string,
  body: Record<string, unknown>,
  accessToken: string
): Promise<Record<string, unknown>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/multipart-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ action, ...body }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Multipart action ${action} failed: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Upload a single part via presigned URL using XHR (supports progress)
 */
function uploadPart(
  partBlob: Blob,
  uploadUrl: string,
  onPartProgress?: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeout = setTimeout(() => {
      xhr.abort();
      reject(new Error('Part upload timed out'));
    }, 120000); // 2 min per part

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onPartProgress) {
        onPartProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      clearTimeout(timeout);
      if (xhr.status >= 200 && xhr.status < 300) {
        // Get ETag from response header
        const etag = xhr.getResponseHeader('ETag');
        if (!etag) {
          reject(new Error('Missing ETag in response'));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Part upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => { clearTimeout(timeout); reject(new Error('Part upload network error')); };
    xhr.onabort = () => { clearTimeout(timeout); reject(new Error('Part upload aborted')); };

    xhr.open('PUT', uploadUrl);
    xhr.send(partBlob);
  });
}

/**
 * Upload a part with retry logic
 */
async function uploadPartWithRetry(
  partBlob: Blob,
  uploadUrl: string,
  partNumber: number,
  onPartProgress?: (loaded: number) => void
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await uploadPart(partBlob, uploadUrl, onPartProgress);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Part ${partNumber} attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Backoff
      }
    }
  }
  throw lastError || new Error(`Part ${partNumber} failed after ${MAX_RETRIES} retries`);
}

/**
 * Multipart upload to R2 for large files
 */
export async function multipartUploadToR2(
  file: File,
  config: MultipartConfig
): Promise<R2UploadResult> {
  const { key, contentType, accessToken, onProgress } = config;
  const totalSize = file.size;
  const totalParts = Math.ceil(totalSize / PART_SIZE);

  // Track progress per part
  const partProgress: number[] = new Array(totalParts).fill(0);
  const reportProgress = () => {
    if (!onProgress) return;
    const totalLoaded = partProgress.reduce((sum, v) => sum + v, 0);
    const percent = Math.min(Math.round((totalLoaded / totalSize) * 100), 99);
    onProgress(percent);
  };

  // Step 1: Initiate multipart upload
  const initResult = await callMultipartAction('initiate', { key, contentType }, accessToken);
  const uploadId = initResult.uploadId as string;

  try {
    // Step 2: Get presigned URLs for all parts
    const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
    const urlResult = await callMultipartAction('get-part-urls', {
      key, uploadId, partNumbers,
    }, accessToken);
    const urls = urlResult.urls as Record<number, string>;

    // Step 3: Upload parts with concurrency limit
    const completedParts: { partNumber: number; etag: string }[] = [];
    let partIndex = 0;

    const uploadNext = async (): Promise<void> => {
      while (partIndex < totalParts) {
        const currentIndex = partIndex++;
        const partNumber = currentIndex + 1;
        const start = currentIndex * PART_SIZE;
        const end = Math.min(start + PART_SIZE, totalSize);
        const partBlob = file.slice(start, end);

        const etag = await uploadPartWithRetry(
          partBlob,
          urls[partNumber],
          partNumber,
          (loaded) => {
            partProgress[currentIndex] = loaded;
            reportProgress();
          }
        );

        // Mark part as fully uploaded
        partProgress[currentIndex] = end - start;
        reportProgress();

        completedParts.push({ partNumber, etag });
      }
    };

    // Run concurrent workers
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, totalParts) },
      () => uploadNext()
    );
    await Promise.all(workers);

    // Step 4: Complete multipart upload
    const completeResult = await callMultipartAction('complete', {
      key, uploadId, parts: completedParts,
    }, accessToken);

    onProgress?.(100);

    return {
      url: completeResult.url as string,
      key: completeResult.key as string,
    };

  } catch (error) {
    // Abort on failure to clean up parts
    console.error('Multipart upload failed, aborting:', error);
    try {
      await callMultipartAction('abort', { key, uploadId }, accessToken);
    } catch (abortError) {
      console.warn('Failed to abort multipart upload:', abortError);
    }
    throw error;
  }
}
