import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  bucket: string;
  totalFiles: number;
  deleted: number;
  errors: Array<{ file: string; error: string }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user with anon key
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role using service key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user.id} running cleanup-supabase-storage`);

    // Parse request body for options
    let dryRun = true; // Default to dry run for safety
    try {
      const body = await req.json();
      dryRun = body.dryRun !== false; // Only execute if explicitly set to false
    } catch {
      // If no body, default to dry run
    }

    console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'EXECUTE (will delete files)'}`);

    const buckets = ['posts', 'videos', 'avatars', 'comment-media'];
    const results: CleanupResult[] = [];
    let totalFilesDeleted = 0;

    for (const bucketName of buckets) {
      const bucketResult: CleanupResult = {
        bucket: bucketName,
        totalFiles: 0,
        deleted: 0,
        errors: [],
      };

      try {
        // List all files in the bucket
        const { data: files, error: listError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .list('', { limit: 10000, offset: 0 });

        if (listError) {
          console.error(`Error listing bucket ${bucketName}:`, listError);
          bucketResult.errors.push({ file: bucketName, error: listError.message });
          results.push(bucketResult);
          continue;
        }

        // Get all files recursively (including subfolders)
        const allFiles: string[] = [];
        
        const listRecursive = async (path: string) => {
          const { data: items, error } = await supabaseAdmin
            .storage
            .from(bucketName)
            .list(path, { limit: 10000 });

          if (error) {
            console.error(`Error listing ${bucketName}/${path}:`, error);
            return;
          }

          for (const item of items || []) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            
            if (item.id) {
              // It's a file
              allFiles.push(fullPath);
            } else {
              // It's a folder, recurse
              await listRecursive(fullPath);
            }
          }
        };

        await listRecursive('');
        bucketResult.totalFiles = allFiles.length;

        console.log(`Bucket ${bucketName}: ${allFiles.length} files found`);

        if (allFiles.length === 0) {
          results.push(bucketResult);
          continue;
        }

        if (dryRun) {
          // In dry run mode, just count files
          bucketResult.deleted = allFiles.length; // Would delete this many
          console.log(`[DRY RUN] Would delete ${allFiles.length} files from ${bucketName}`);
        } else {
          // Actually delete files in batches
          const batchSize = 100;
          for (let i = 0; i < allFiles.length; i += batchSize) {
            const batch = allFiles.slice(i, i + batchSize);
            
            const { error: deleteError } = await supabaseAdmin
              .storage
              .from(bucketName)
              .remove(batch);

            if (deleteError) {
              console.error(`Error deleting batch from ${bucketName}:`, deleteError);
              bucketResult.errors.push({ 
                file: `batch ${Math.floor(i / batchSize) + 1}`, 
                error: deleteError.message 
              });
            } else {
              bucketResult.deleted += batch.length;
              console.log(`Deleted ${batch.length} files from ${bucketName} (${bucketResult.deleted}/${allFiles.length})`);
            }

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        totalFilesDeleted += bucketResult.deleted;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing bucket ${bucketName}:`, error);
        bucketResult.errors.push({ file: bucketName, error: errorMessage });
      }

      results.push(bucketResult);
    }

    console.log(`Cleanup complete. Total files ${dryRun ? 'would be' : ''} deleted: ${totalFilesDeleted}`);

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      message: dryRun 
        ? `Preview: ${totalFilesDeleted} files would be deleted` 
        : `Deleted ${totalFilesDeleted} files`,
      totalFiles: results.reduce((sum, r) => sum + r.totalFiles, 0),
      totalDeleted: totalFilesDeleted,
      buckets: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in cleanup:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
