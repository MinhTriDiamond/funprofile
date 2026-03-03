import { supabase } from '@/integrations/supabase/client';

interface MultipartUploadOptions {
  key: string;
  contentType: string;
  accessToken?: string;
  onProgress?: (percent: number) => void;
  partSize?: number;
}

interface MultipartUploadResult {
  url: string;
  key: string;
}

const DEFAULT_PART_SIZE = 10 * 1024 * 1024; // 10MB per part

/**
 * Multipart upload to R2 for large files (>50MB)
 * Splits file into parts and uploads each via presigned URLs
 */
export async function multipartUploadToR2(
  file: File,
  options: MultipartUploadOptions
): Promise<MultipartUploadResult> {
  const { key, contentType, accessToken, onProgress, partSize = DEFAULT_PART_SIZE } = options;

  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Chưa đăng nhập');
    token = session.access_token;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseKey,
  };

  // 1. Initiate multipart upload
  const initRes = await fetch(`${supabaseUrl}/functions/v1/multipart-upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create', key, contentType }),
  });
  if (!initRes.ok) throw new Error(`Initiate multipart upload failed: ${initRes.status}`);
  const { uploadId, publicUrl } = await initRes.json();

  // 2. Upload parts
  const totalParts = Math.ceil(file.size / partSize);
  const etags: { partNumber: number; etag: string }[] = [];
  let uploadedBytes = 0;

  for (let i = 0; i < totalParts; i++) {
    const start = i * partSize;
    const end = Math.min(start + partSize, file.size);
    const partBlob = file.slice(start, end);
    const partNumber = i + 1;

    // Get presigned URL for this part
    const partRes = await fetch(`${supabaseUrl}/functions/v1/multipart-upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'sign-part', key, uploadId, partNumber }),
    });
    if (!partRes.ok) throw new Error(`Sign part ${partNumber} failed`);
    const { signedUrl } = await partRes.json();

    // Upload part
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      body: partBlob,
    });
    if (!uploadRes.ok) throw new Error(`Upload part ${partNumber} failed`);

    const etag = uploadRes.headers.get('ETag') || `"part-${partNumber}"`;
    etags.push({ partNumber, etag });

    uploadedBytes += (end - start);
    onProgress?.(Math.round((uploadedBytes / file.size) * 100));
  }

  // 3. Complete multipart upload
  const completeRes = await fetch(`${supabaseUrl}/functions/v1/multipart-upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'complete', key, uploadId, parts: etags }),
  });
  if (!completeRes.ok) throw new Error('Complete multipart upload failed');

  return { url: publicUrl, key };
}
