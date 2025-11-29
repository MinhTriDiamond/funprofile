import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const AdminMigration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [totalMigrated, setTotalMigrated] = useState(0);

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

      // Check if user has admin role
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error || !roleData || roleData.role !== 'admin') {
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

  const runClientMigration = async () => {
    setMigrating(true);
    setResults(null);
    setTotalMigrated(0);

    try {
      toast.info('🚀 Đang tải danh sách files...');

      // Get all unmigrated URLs from database
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, video_url')
        .or('image_url.like.%supabase.co/storage%,video_url.like.%supabase.co/storage%')
        .limit(1000);

      if (postsError) throw postsError;

      const urlsToMigrate: Array<{
        id: string;
        url: string;
        type: 'image_url' | 'video_url';
        bucket: string;
      }> = [];

      posts?.forEach(post => {
        if (post.image_url?.includes('supabase.co/storage')) {
          urlsToMigrate.push({
            id: post.id,
            url: post.image_url,
            type: 'image_url',
            bucket: 'posts'
          });
        }
        if (post.video_url?.includes('supabase.co/storage')) {
          urlsToMigrate.push({
            id: post.id,
            url: post.video_url,
            type: 'video_url',
            bucket: 'videos'
          });
        }
      });

      console.log(`Found ${urlsToMigrate.length} files to migrate`);
      toast.info(`📊 Tìm thấy ${urlsToMigrate.length} files cần migrate`);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process one file at a time
      for (let i = 0; i < urlsToMigrate.length; i++) {
        const item = urlsToMigrate[i];
        
        try {
          // Extract path from URL
          const pathMatch = item.url.match(/\/(posts|videos|avatars|comment-media)\/(.+)$/);
          if (!pathMatch) {
            console.error('Could not extract path from URL:', item.url);
            errorCount++;
            errors.push(`Invalid URL format: ${item.url}`);
            continue;
          }

          const [, bucket, filePath] = pathMatch;

          toast.info(`⏳ Đang xử lý file ${i + 1}/${urlsToMigrate.length}...`);

          // Download from Supabase Storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(filePath);

          if (downloadError) {
            console.error(`Download error for ${filePath}:`, downloadError);
            errorCount++;
            errors.push(`Download failed: ${filePath}`);
            continue;
          }

          // Skip large files
          if (fileData.size > 10 * 1024 * 1024) {
            console.log(`Skipping large file (${(fileData.size / 1024 / 1024).toFixed(2)}MB): ${filePath}`);
            errorCount++;
            errors.push(`File too large: ${filePath}`);
            continue;
          }

          // Convert to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let base64 = '';
          const chunkSize = 8192;
          for (let j = 0; j < bytes.length; j += chunkSize) {
            const chunk = bytes.subarray(j, j + chunkSize);
            base64 += String.fromCharCode(...chunk);
          }
          base64 = btoa(base64);

          // Upload to R2
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-r2', {
            body: {
              file: base64,
              key: `${bucket}/${filePath}`,
              contentType: fileData.type || 'application/octet-stream',
            },
          });

          if (uploadError) {
            console.error(`Upload error for ${filePath}:`, uploadError);
            errorCount++;
            errors.push(`Upload failed: ${filePath}`);
            continue;
          }

          // Update database
          const { error: updateError } = await supabase
            .from('posts')
            .update({ [item.type]: uploadData.url })
            .eq('id', item.id);

          if (updateError) {
            console.error(`Database update error for ${filePath}:`, updateError);
            errorCount++;
            errors.push(`DB update failed: ${filePath}`);
            continue;
          }

          successCount++;
          setTotalMigrated(successCount);
          console.log(`✅ Migrated: ${filePath}`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          console.error('Error processing file:', error);
          errorCount++;
          errors.push(error.message || 'Unknown error');
        }
      }

      setResults({
        totalFiles: urlsToMigrate.length,
        successful: successCount,
        errors: errorCount,
        errorDetails: errors,
        dryRun: false,
        updateDatabase: true
      });

      toast.success(`✅ Hoàn thành! Đã migrate ${successCount}/${urlsToMigrate.length} files`);

    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi chạy migration');
      setResults({ error: error.message || 'Unknown error' });
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-4xl py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Migration to Cloudflare R2</h1>
          <p className="text-muted-foreground">
            Migrate files from Supabase Storage to Cloudflare R2
          </p>
        </div>

        <div className="grid gap-6">
          {/* Client-Side Migration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                🌐 Client-Side Migration
              </CardTitle>
              <CardDescription>
                Migration chạy trực tiếp trên trình duyệt, xử lý từng file một, tránh giới hạn của edge function
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Migration sẽ xử lý từng file một trên trình duyệt của bạn. Files &gt;10MB sẽ tự động bỏ qua. <strong>Không đóng tab này khi đang chạy!</strong>
                </AlertDescription>
              </Alert>
              
              {totalMigrated > 0 && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600 font-semibold">
                    📊 Đã migrate: {totalMigrated} files
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={runClientMigration}
                disabled={migrating}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang migrate... ({totalMigrated} files)
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    🚀 Bắt đầu Migration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {results.error ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  Kết Quả
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Lỗi:</strong> {results.error}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-500">
                          {results.totalFiles || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Tổng files</div>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                          {results.successful || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Thành công</div>
                      </div>
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="text-2xl font-bold text-destructive">
                          {results.errors || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Lỗi</div>
                      </div>
                    </div>
                    
                    {results.totalFiles === 0 && (
                      <Alert>
                        <AlertDescription>
                          ✅ Không còn files nào cần migrate! Tất cả files đã được chuyển sang R2.
                        </AlertDescription>
                      </Alert>
                    )}

                    {results.results && results.results.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">Chi tiết theo bucket:</h3>
                        {results.results.map((result: any, index: number) => (
                          <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="font-medium">{result.bucket}</div>
                            <div className="text-muted-foreground">
                              Processed: {result.processed} | Success: {result.success} | Errors: {result.errors}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(results, null, 2)}
                    </pre>
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
