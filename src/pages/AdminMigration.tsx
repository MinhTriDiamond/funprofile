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

  const runMigration = async (dryRun: boolean) => {
    setMigrating(true);
    setResults(null);

    try {
      toast.info(dryRun ? 'Đang chạy test migration...' : 'Đang chạy migration...');

      const { data, error } = await supabase.functions.invoke('migrate-to-r2', {
        body: {
          dryRun,
          limit: dryRun ? 10 : 1000,
          updateDatabase: !dryRun
        }
      });

      if (error) throw error;

      setResults(data);
      
      if (dryRun) {
        toast.success('Test migration hoàn tất!');
      } else {
        toast.success('Migration hoàn tất!');
      }
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
          {/* Test Dry Run */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Test Migration (Dry Run)
              </CardTitle>
              <CardDescription>
                Chạy thử migration với 10 files đầu tiên. Không thay đổi database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runMigration(true)}
                disabled={migrating}
                variant="outline"
                className="w-full"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang chạy test...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Chạy Test Migration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Actual Migration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Full Migration
              </CardTitle>
              <CardDescription>
                Migrate tất cả files và cập nhật database URLs. Hành động này không thể hoàn tác!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  ⚠️ Hãy chắc chắn rằng bạn đã chạy test migration thành công trước khi chạy full migration!
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn migrate tất cả files? Hành động này không thể hoàn tác!')) {
                    runMigration(false);
                  }
                }}
                disabled={migrating}
                className="w-full"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang migrate...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Chạy Full Migration
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                          {results.summary?.totalSuccess || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Files thành công</div>
                      </div>
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="text-2xl font-bold text-destructive">
                          {results.summary?.totalErrors || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Lỗi</div>
                      </div>
                    </div>

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
