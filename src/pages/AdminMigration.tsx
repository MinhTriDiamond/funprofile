import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Database, CheckCircle, XCircle, AlertTriangle, SkipForward, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MigrationResult {
  total: number;
  migrated: number;
  alreadyOnR2: number;
  errors: Array<{ url: string; error: string }>;
}

const AdminMigration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [result, setResult] = useState<MigrationResult | null>(null);
  
  // Skip/Stop controls
  const skipCurrentRef = useRef(false);
  const stopProcessRef = useRef(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: hasRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (!hasRole) {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getPresignedUrl = async (key: string, contentType: string, fileSize: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-presigned-url`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, contentType, fileSize }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get presigned URL');
    }

    return response.json();
  };

  const uploadWithPresignedUrl = async (
    presignedUrl: string, 
    fileBlob: Blob, 
    contentType: string,
    onProgress?: (percent: number) => void,
    maxRetries = 3
  ): Promise<boolean> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise<boolean>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Timeout: 5 minutes for large files
          xhr.timeout = 300000;
          
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error(`Network error (attempt ${attempt}/${maxRetries})`));
          });
          xhr.addEventListener('timeout', () => {
            reject(new Error(`Upload timeout (attempt ${attempt}/${maxRetries})`));
          });
          xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

          xhr.open('PUT', presignedUrl);
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.send(fileBlob);
        });
        
        return true; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Upload attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Upload failed after all retries');
  };

  const downloadFile = async (
    url: string,
    onProgress?: (percent: number) => void,
    maxRetries = 3
  ): Promise<{ blob: Blob; contentType: string }> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await new Promise<{ blob: Blob; contentType: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Timeout: 5 minutes (large videos)
          xhr.timeout = 300000;

          xhr.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent);
            }
          });

          xhr.addEventListener('load', () => {
            const status = xhr.status;
            if (status >= 200 && status < 300) {
              const contentType = xhr.getResponseHeader('content-type') || 'application/octet-stream';
              const blob = xhr.response as Blob;
              resolve({ blob, contentType });
              return;
            }

            if (status === 404) {
              reject(new Error('File not found (404)'));
              return;
            }

            reject(new Error(`Download failed with status ${status}`));
          });

          xhr.addEventListener('error', () => reject(new Error('Network error during download')));
          xhr.addEventListener('timeout', () => reject(new Error('Download timeout')));
          xhr.addEventListener('abort', () => reject(new Error('Download aborted')));

          xhr.open('GET', url, true);
          xhr.responseType = 'blob';
          xhr.send();
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Download attempt ${attempt}/${maxRetries} failed:`, lastError.message, url);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error('Download failed after all retries');
  };

  const getFileExtension = (url: string, contentType: string): string => {
    try {
      const urlPath = new URL(url).pathname;
      const urlExt = urlPath.split('.').pop()?.toLowerCase();
      if (urlExt && urlExt.length <= 5) return urlExt;
    } catch {}

    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    return typeMap[contentType] || 'bin';
  };

  // Check if file exists on R2 using HEAD request with timeout
  const checkFileExistsOnR2 = async (r2PublicUrl: string, supabaseUrl: string): Promise<string | null> => {
    try {
      // Extract filename from Supabase URL
      const urlPath = new URL(supabaseUrl).pathname;
      const fileName = urlPath.split('/').pop();
      if (!fileName) return null;

      // Try to find the file on R2 with various possible paths
      const possiblePaths = [
        `migration/posts/${fileName}`,
        `migration/profiles/${fileName}`,
        `migration/comments/${fileName}`,
        `posts/${fileName}`,
        `avatars/${fileName}`,
        `videos/${fileName}`,
        `comment-media/${fileName}`,
      ];

      // Helper function to fetch with timeout
      const fetchWithTimeout = async (url: string, timeoutMs: number = 5000): Promise<Response | null> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          const response = await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          return response;
        } catch {
          clearTimeout(timeoutId);
          return null;
        }
      };

      for (const path of possiblePaths) {
        // Check if skip was requested
        if (skipCurrentRef.current) {
          console.log('⏭️ Skip requested during R2 check');
          return null;
        }
        
        const r2Url = `${r2PublicUrl}/${path}`;
        try {
          const response = await fetchWithTimeout(r2Url, 5000);
          if (response?.ok) {
            console.log(`✅ Found existing file on R2: ${r2Url}`);
            return r2Url;
          }
        } catch {
          // Continue checking other paths
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking R2:', error);
      return null;
    }
  };

  // Repair Database - Check R2 first, only upload if not exists
  const runRepairDatabase = async () => {
    setRepairing(true);
    setProgress(0);
    setResult(null);
    setCurrentFile('');
    skipCurrentRef.current = false;
    stopProcessRef.current = false;

    const repairResult: MigrationResult = {
      total: 0,
      migrated: 0,
      alreadyOnR2: 0,
      errors: [],
    };

    try {
      toast.info('🔧 Đang quét database và kiểm tra R2...');

      const r2PublicUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';
      
      // Get all URLs that still point to Supabase
      const { data: posts } = await supabase
        .from('posts')
        .select('id, image_url, video_url')
        .or('image_url.not.is.null,video_url.not.is.null');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, cover_url')
        .or('avatar_url.not.is.null,cover_url.not.is.null');

      const { data: comments } = await supabase
        .from('comments')
        .select('id, image_url, video_url')
        .or('image_url.not.is.null,video_url.not.is.null');

      const urlsToProcess: Array<{
        table: string;
        id: string;
        field: string;
        url: string;
      }> = [];

      const isSupabaseUrl = (url: string | null) => {
        if (!url) return false;
        if (r2PublicUrl && url.includes(r2PublicUrl)) return false;
        if (url.includes('r2.dev')) return false;
        return (
          url.includes('.supabase.co/storage') ||
          url.includes('.supabase.in/storage') ||
          url.includes('supabase.co/storage') ||
          url.includes('supabase.in/storage')
        );
      };

      posts?.forEach(post => {
        if (isSupabaseUrl(post.image_url)) {
          urlsToProcess.push({ table: 'posts', id: post.id, field: 'image_url', url: post.image_url! });
        }
        if (isSupabaseUrl(post.video_url)) {
          urlsToProcess.push({ table: 'posts', id: post.id, field: 'video_url', url: post.video_url! });
        }
      });

      profiles?.forEach(profile => {
        if (isSupabaseUrl(profile.avatar_url)) {
          urlsToProcess.push({ table: 'profiles', id: profile.id, field: 'avatar_url', url: profile.avatar_url! });
        }
        if (isSupabaseUrl(profile.cover_url)) {
          urlsToProcess.push({ table: 'profiles', id: profile.id, field: 'cover_url', url: profile.cover_url! });
        }
      });

      comments?.forEach(comment => {
        if (isSupabaseUrl(comment.image_url)) {
          urlsToProcess.push({ table: 'comments', id: comment.id, field: 'image_url', url: comment.image_url! });
        }
        if (isSupabaseUrl(comment.video_url)) {
          urlsToProcess.push({ table: 'comments', id: comment.id, field: 'video_url', url: comment.video_url! });
        }
      });

      repairResult.total = urlsToProcess.length;

      if (urlsToProcess.length === 0) {
        toast.success('✅ Không còn files nào cần xử lý!');
        setResult(repairResult);
        setRepairing(false);
        return;
      }

      toast.info(`📊 Tìm thấy ${urlsToProcess.length} URLs cần kiểm tra`);

      // Process each URL
      for (let i = 0; i < urlsToProcess.length; i++) {
        // Check if stop was requested
        if (stopProcessRef.current) {
          toast.info('⏹️ Đã dừng quá trình');
          break;
        }
        
        // Reset skip flag for new file
        skipCurrentRef.current = false;
        
        const item = urlsToProcess[i];
        const fileName = item.url.split('/').pop() || `file_${Date.now()}`;
        setCurrentFile(`${i + 1}/${urlsToProcess.length}: Kiểm tra ${fileName}`);
        setProgress(Math.round((i / urlsToProcess.length) * 100));

        try {
          // Step 1: Check if file already exists on R2
          const existingR2Url = await checkFileExistsOnR2(r2PublicUrl, item.url);

          // Check if skip was requested during R2 check
          if (skipCurrentRef.current) {
            console.log(`⏭️ Skipped: ${fileName}`);
            repairResult.errors.push({
              url: item.url,
              error: 'Skipped by user',
            });
            continue;
          }

          if (existingR2Url) {
            // File exists on R2 - just update DB
            setCurrentFile(`${i + 1}/${urlsToProcess.length}: 📝 Update DB cho ${fileName}`);
            
            const { error: updateError, data: updateData } = await supabase
              .from(item.table as 'posts' | 'profiles' | 'comments')
              .update({ [item.field]: existingR2Url })
              .eq('id', item.id)
              .select(item.field);

            if (updateError) {
              throw new Error(`DB update failed: ${updateError.message}`);
            }

            if (!updateData || updateData.length === 0) {
              throw new Error(`DB update failed: Row ${item.id} not found`);
            }

            repairResult.alreadyOnR2++;
            console.log(`✅ DB updated (file already on R2): ${fileName} -> ${existingR2Url}`);
          } else {
            // File not on R2 - need to download and upload
            setCurrentFile(`${i + 1}/${urlsToProcess.length}: 📥 Download ${fileName}`);
            
            const { blob, contentType } = await downloadFile(item.url);
            
            // Check if skip was requested during download
            if (skipCurrentRef.current) {
              console.log(`⏭️ Skipped after download: ${fileName}`);
              repairResult.errors.push({
                url: item.url,
                error: 'Skipped by user',
              });
              continue;
            }
            
            const fileSize = blob.size;

            console.log(`📥 Downloaded: ${fileName}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

            // Generate unique key for R2
            const ext = getFileExtension(item.url, contentType);
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const key = `migration/${item.table}/${timestamp}_${randomStr}.${ext}`;

            setCurrentFile(`${i + 1}/${urlsToProcess.length}: 📤 Upload ${fileName}`);

            // Get presigned URL
            const { uploadUrl, publicUrl } = await getPresignedUrl(key, contentType, fileSize);

            // Upload to R2
            await uploadWithPresignedUrl(uploadUrl, blob, contentType, (percent) => {
              const baseProgress = (i / urlsToProcess.length) * 100;
              const fileProgress = (percent / urlsToProcess.length);
              setProgress(Math.round(baseProgress + fileProgress));
            });

            // Update database
            const { error: updateError, data: updateData } = await supabase
              .from(item.table as 'posts' | 'profiles' | 'comments')
              .update({ [item.field]: publicUrl })
              .eq('id', item.id)
              .select(item.field);

            if (updateError) {
              throw new Error(`DB update failed: ${updateError.message}`);
            }

            if (!updateData || updateData.length === 0) {
              throw new Error(`DB update failed: Row ${item.id} not found`);
            }

            const updatedUrl = updateData[0][item.field];
            if (!updatedUrl?.includes('r2.dev')) {
              throw new Error(`DB update verification failed`);
            }

            repairResult.migrated++;
            console.log(`✅ Uploaded & DB updated: ${fileName} -> ${publicUrl}`);
          }

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error processing ${item.url}:`, error);
          repairResult.errors.push({
            url: item.url,
            error: errorMessage,
          });
        }
      }

      setProgress(100);
      setCurrentFile('');
      setResult(repairResult);

      const total = repairResult.alreadyOnR2 + repairResult.migrated;
      if (repairResult.errors.length === 0) {
        toast.success(`🎉 Hoàn thành! ${repairResult.alreadyOnR2} đã có trên R2, ${repairResult.migrated} uploaded mới!`);
      } else {
        toast.warning(`⚠️ Xử lý ${total} files với ${repairResult.errors.length} lỗi`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Repair error:', error);
      toast.error(`❌ Lỗi: ${errorMessage}`);
    } finally {
      setRepairing(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setProgress(0);
    setResult(null);
    setCurrentFile('');
    skipCurrentRef.current = false;
    stopProcessRef.current = false;

    const migrationResult: MigrationResult = {
      total: 0,
      migrated: 0,
      alreadyOnR2: 0,
      errors: [],
    };

    try {
      toast.info('🚀 Đang tải danh sách files...');

      const r2PublicUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';
      
      // Get all URLs that need migration
      const { data: posts } = await supabase
        .from('posts')
        .select('id, image_url, video_url')
        .or('image_url.not.is.null,video_url.not.is.null');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, cover_url')
        .or('avatar_url.not.is.null,cover_url.not.is.null');

      const { data: comments } = await supabase
        .from('comments')
        .select('id, image_url, video_url')
        .or('image_url.not.is.null,video_url.not.is.null');

      const urlsToMigrate: Array<{
        table: string;
        id: string;
        field: string;
        url: string;
      }> = [];

      const isSupabaseUrl = (url: string | null) => {
        if (!url) return false;
        // Skip if already R2
        if (r2PublicUrl && url.includes(r2PublicUrl)) return false;
        // Check for Supabase storage patterns
        return (
          url.includes('.supabase.co/storage') ||
          url.includes('.supabase.in/storage') ||
          url.includes('supabase.co/storage') ||
          url.includes('supabase.in/storage')
        );
      };

      posts?.forEach(post => {
        if (isSupabaseUrl(post.image_url)) {
          urlsToMigrate.push({ table: 'posts', id: post.id, field: 'image_url', url: post.image_url! });
        }
        if (isSupabaseUrl(post.video_url)) {
          urlsToMigrate.push({ table: 'posts', id: post.id, field: 'video_url', url: post.video_url! });
        }
      });

      profiles?.forEach(profile => {
        if (isSupabaseUrl(profile.avatar_url)) {
          urlsToMigrate.push({ table: 'profiles', id: profile.id, field: 'avatar_url', url: profile.avatar_url! });
        }
        if (isSupabaseUrl(profile.cover_url)) {
          urlsToMigrate.push({ table: 'profiles', id: profile.id, field: 'cover_url', url: profile.cover_url! });
        }
      });

      comments?.forEach(comment => {
        if (isSupabaseUrl(comment.image_url)) {
          urlsToMigrate.push({ table: 'comments', id: comment.id, field: 'image_url', url: comment.image_url! });
        }
        if (isSupabaseUrl(comment.video_url)) {
          urlsToMigrate.push({ table: 'comments', id: comment.id, field: 'video_url', url: comment.video_url! });
        }
      });

      migrationResult.total = urlsToMigrate.length;

      if (urlsToMigrate.length === 0) {
        toast.success('✅ Không còn files nào cần migrate!');
        setResult(migrationResult);
        setMigrating(false);
        return;
      }

      toast.info(`📊 Tìm thấy ${urlsToMigrate.length} files cần migrate`);

      // Process each file with presigned URLs
      for (let i = 0; i < urlsToMigrate.length; i++) {
        // Check if stop was requested
        if (stopProcessRef.current) {
          toast.info('⏹️ Đã dừng quá trình');
          break;
        }
        
        // Reset skip flag for new file
        skipCurrentRef.current = false;
        
        const item = urlsToMigrate[i];
        const fileName = item.url.split('/').pop() || `file_${Date.now()}`;
        setCurrentFile(`${i + 1}/${urlsToMigrate.length}: ${fileName}`);
        setProgress(Math.round((i / urlsToMigrate.length) * 100));

        try {
          // Download file from Supabase
          const { blob, contentType } = await downloadFile(item.url);
          
          // Check if skip was requested during download
          if (skipCurrentRef.current) {
            console.log(`⏭️ Skipped: ${fileName}`);
            migrationResult.errors.push({
              url: item.url,
              error: 'Skipped by user',
            });
            continue;
          }
          
          const fileSize = blob.size;

          console.log(`📥 Migrating: ${fileName}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

          // Generate unique key for R2
          const ext = getFileExtension(item.url, contentType);
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const key = `migration/${item.table}/${timestamp}_${randomStr}.${ext}`;

          // Get presigned URL from edge function
          const { uploadUrl, publicUrl } = await getPresignedUrl(key, contentType, fileSize);

          // Upload directly to R2 with presigned URL
          await uploadWithPresignedUrl(uploadUrl, blob, contentType, (percent) => {
            const baseProgress = (i / urlsToMigrate.length) * 100;
            const fileProgress = (percent / urlsToMigrate.length);
            setProgress(Math.round(baseProgress + fileProgress));
          });

          // Update database with new R2 URL
          console.log(`📝 Updating DB: ${item.table}.${item.field} = ${publicUrl}`);
          
          const { error: updateError, data: updateData } = await supabase
            .from(item.table as 'posts' | 'profiles' | 'comments')
            .update({ [item.field]: publicUrl })
            .eq('id', item.id)
            .select(item.field);

          if (updateError) {
            console.error(`❌ DB update error:`, updateError);
            throw new Error(`DB update failed: ${updateError.message}`);
          }

          // Verify the update was successful
          if (!updateData || updateData.length === 0) {
            console.error(`❌ DB update returned no data - row may not exist`);
            throw new Error(`DB update failed: Row ${item.id} not found in ${item.table}`);
          }

          const updatedUrl = updateData[0][item.field];
          if (!updatedUrl?.includes('r2.dev')) {
            console.error(`❌ DB update verification failed. Expected R2 URL, got: ${updatedUrl}`);
            throw new Error(`DB update verification failed: URL not updated to R2`);
          }

          migrationResult.migrated++;
          console.log(`✅ Migrated & verified: ${fileName} -> ${publicUrl}`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error migrating ${item.url}:`, error);
          migrationResult.errors.push({
            url: item.url,
            error: errorMessage,
          });
        }
      }

      setProgress(100);
      setCurrentFile('');
      setResult(migrationResult);

      if (migrationResult.errors.length === 0) {
        toast.success(`🎉 Hoàn thành! Đã migrate ${migrationResult.migrated} files!`);
      } else {
        toast.warning(`⚠️ Migrate ${migrationResult.migrated} files với ${migrationResult.errors.length} lỗi`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Migration error:', error);
      toast.error(`❌ Lỗi: ${errorMessage}`);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <FacebookNavbar />
        <main className="container max-w-4xl pt-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <FacebookNavbar />
      <main className="container max-w-4xl pt-20 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🗂️ Migration to Cloudflare R2</h1>
          <p className="text-muted-foreground">
            Migrate files from Supabase Storage to Cloudflare R2 using presigned URLs (no file size limit)
          </p>
        </div>

        <div className="grid gap-6">
          {/* Repair Database Card - Recommended */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                🔧 Repair Database (Khuyến nghị)
              </CardTitle>
              <CardDescription>
                Kiểm tra R2 trước khi upload - không bị trùng file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-green-700">✨ Tính năng thông minh:</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>✅ <strong>Kiểm tra file trên R2 trước</strong> - tránh upload trùng</li>
                  <li>✅ File đã có trên R2 → chỉ update DB (nhanh)</li>
                  <li>✅ File chưa có → download & upload mới</li>
                  <li>✅ Tiết kiệm băng thông và dung lượng R2</li>
                </ul>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Database className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  <strong>💡 Phù hợp khi:</strong> Đã migrate trước đó nhưng DB chưa update đúng (168+ files đã có trên R2 nhưng URL chưa đổi)
                </AlertDescription>
              </Alert>

              <Button 
                onClick={runRepairDatabase}
                disabled={repairing || migrating}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {repairing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý... {progress}%
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    🔧 Repair Database (Check R2 First)
                  </>
                )}
              </Button>

              {repairing && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  {currentFile && (
                    <p className="text-sm text-muted-foreground text-center">
                      📁 {currentFile}
                    </p>
                  )}
                  
                  {/* Skip and Stop buttons */}
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => {
                        skipCurrentRef.current = true;
                        toast.info('⏭️ Đang bỏ qua file hiện tại...');
                      }}
                      variant="outline"
                      size="sm"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Bỏ qua file này
                    </Button>
                    <Button
                      onClick={() => {
                        stopProcessRef.current = true;
                        toast.info('⏹️ Đang dừng quá trình...');
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <StopCircle className="w-4 h-4 mr-1" />
                      Dừng lại
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Standard Migration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-muted-foreground" />
                🚀 Standard Migration
              </CardTitle>
              <CardDescription>
                Migration thông thường - upload tất cả files (có thể tạo file trùng)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <strong>⚠️ Lưu ý:</strong> Sẽ upload lại tất cả files, có thể tạo file trùng trên R2 nếu đã migrate trước đó.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={runMigration}
                disabled={migrating || repairing}
                className="w-full"
                variant="outline"
                size="lg"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang migrate... {progress}%
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    🚀 Standard Migration (Upload All)
                  </>
                )}
              </Button>

              {migrating && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  {currentFile && (
                    <p className="text-sm text-muted-foreground text-center">
                      📁 {currentFile}
                    </p>
                  )}
                  
                  {/* Skip and Stop buttons */}
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => {
                        skipCurrentRef.current = true;
                        toast.info('⏭️ Đang bỏ qua file hiện tại...');
                      }}
                      variant="outline"
                      size="sm"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Bỏ qua file này
                    </Button>
                    <Button
                      onClick={() => {
                        stopProcessRef.current = true;
                        toast.info('⏹️ Đang dừng quá trình...');
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <StopCircle className="w-4 h-4 mr-1" />
                      Dừng lại
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.errors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  Kết Quả
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                    <div className="text-sm text-muted-foreground">Tổng files</div>
                  </div>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.alreadyOnR2}</div>
                    <div className="text-sm text-muted-foreground">Đã có trên R2</div>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="w-5 h-5" />
                      {result.migrated}
                    </div>
                    <div className="text-sm text-muted-foreground">Upload mới</div>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                      <XCircle className="w-5 h-5" />
                      {result.errors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Lỗi</div>
                  </div>
                </div>

                {result.total === 0 && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      ✅ Không còn files nào cần xử lý! Tất cả đã được chuyển sang R2.
                    </AlertDescription>
                  </Alert>
                )}

                {result.alreadyOnR2 > 0 && (
                  <Alert className="bg-purple-500/10 border-purple-500/20">
                    <Database className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-700">
                      📝 {result.alreadyOnR2} files đã có trên R2 - chỉ cập nhật URL trong database (không upload lại)
                    </AlertDescription>
                  </Alert>
                )}

                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Files gặp lỗi:
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                          <div className="font-mono truncate text-red-800">{err.url}</div>
                          <div className="text-red-600">{err.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMigration;
