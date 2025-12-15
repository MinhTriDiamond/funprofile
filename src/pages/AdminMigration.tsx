import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface MigrationResult {
  total: number;
  migrated: number;
  errors: Array<{ url: string; error: string }>;
}

const AdminMigration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [result, setResult] = useState<MigrationResult | null>(null);

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
    onProgress?: (percent: number) => void
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
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
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(fileBlob);
    });
  };

  const downloadFile = async (url: string): Promise<{ blob: Blob; contentType: string }> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();
    
    return { blob, contentType };
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

  const runMigration = async () => {
    setMigrating(true);
    setProgress(0);
    setResult(null);
    setCurrentFile('');

    const migrationResult: MigrationResult = {
      total: 0,
      migrated: 0,
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
        return url && (
          url.includes('supabase.co/storage') ||
          url.includes('supabase.in/storage')
        ) && !url.includes(r2PublicUrl);
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
        const item = urlsToMigrate[i];
        const fileName = item.url.split('/').pop() || `file_${Date.now()}`;
        setCurrentFile(`${i + 1}/${urlsToMigrate.length}: ${fileName}`);
        setProgress(Math.round((i / urlsToMigrate.length) * 100));

        try {
          // Download file from Supabase
          const { blob, contentType } = await downloadFile(item.url);
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
          const { error: updateError } = await supabase
            .from(item.table as 'posts' | 'profiles' | 'comments')
            .update({ [item.field]: publicUrl })
            .eq('id', item.id);

          if (updateError) {
            throw new Error(`DB update failed: ${updateError.message}`);
          }

          migrationResult.migrated++;
          console.log(`✅ Migrated: ${fileName} -> ${publicUrl}`);

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Presigned URL Migration
              </CardTitle>
              <CardDescription>
                Migration với presigned URLs - hỗ trợ mọi kích thước file, upload trực tiếp lên R2
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">✨ Tính năng mới:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ <strong>Không giới hạn file size</strong> (hỗ trợ file &gt;10MB)</li>
                  <li>✅ Upload trực tiếp lên R2 với presigned URLs</li>
                  <li>✅ Progress tracking cho files lớn</li>
                  <li>✅ Tự động cập nhật database URLs</li>
                </ul>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Migration sẽ xử lý từng file một. <strong>Không đóng tab này khi đang chạy!</strong>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={runMigration}
                disabled={migrating}
                className="w-full"
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
                    🚀 Bắt đầu Migration
                  </>
                )}
              </Button>

              {migrating && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  {currentFile && (
                    <p className="text-sm text-muted-foreground text-center">
                      📁 {currentFile}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.errors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  Kết Quả Migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                    <div className="text-sm text-muted-foreground">Tổng files</div>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="w-5 h-5" />
                      {result.migrated}
                    </div>
                    <div className="text-sm text-muted-foreground">Thành công</div>
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
                      ✅ Không còn files nào cần migrate! Tất cả đã được chuyển sang R2.
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
