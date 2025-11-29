import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  bucket: string;
  path: string;
  originalUrl: string;
  newUrl: string;
  status: 'success' | 'error';
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID');
    const CLOUDFLARE_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    const { bucket, limit = 100, dryRun = false, updateDatabase = true } = await req.json();
    
    const bucketsToProcess = bucket ? [bucket] : ['posts', 'avatars', 'videos', 'comment-media'];
    const results: MigrationResult[] = [];

    console.log(`Starting migration - Dry Run: ${dryRun}, Buckets: ${bucketsToProcess.join(', ')}, Limit: ${limit}`);

    for (const bucketName of bucketsToProcess) {
      console.log(`Processing bucket: ${bucketName}`);
      
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(bucketName)
        .list('', {
          limit: limit,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        console.error(`Error listing files in ${bucketName}:`, listError);
        continue;
      }

      console.log(`Found ${files?.length || 0} files in ${bucketName}`);

      for (const file of files || []) {
        if (!file.name || file.name.endsWith('/')) continue;

        try {
          // Download from Supabase
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from(bucketName)
            .download(file.name);

          if (downloadError) throw downloadError;

          const originalUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketName}/${file.name}`;
          
          if (!dryRun) {
            // Upload to Cloudflare R2
            const r2Key = `${bucketName}/${file.name}`;
            await uploadToR2(
              fileData,
              r2Key,
              file.metadata?.mimetype || 'application/octet-stream',
              CLOUDFLARE_ACCOUNT_ID,
              CLOUDFLARE_ACCESS_KEY_ID,
              CLOUDFLARE_SECRET_ACCESS_KEY,
              CLOUDFLARE_R2_BUCKET_NAME
            );

            const newUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${r2Key}`;

            // Update database URLs
            if (updateDatabase) {
              await updateDatabaseUrls(supabaseAdmin, bucketName, file.name, originalUrl, newUrl);
            }

            console.log(`Migrated: ${bucketName}/${file.name}`);
            
            results.push({
              bucket: bucketName,
              path: file.name,
              originalUrl,
              newUrl,
              status: 'success'
            });
          } else {
            const newUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${bucketName}/${file.name}`;
            results.push({
              bucket: bucketName,
              path: file.name,
              originalUrl,
              newUrl,
              status: 'success',
              message: 'Dry run - not uploaded'
            });
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing ${file.name}:`, errorMessage);
          results.push({
            bucket: bucketName,
            path: file.name,
            originalUrl: '',
            newUrl: '',
            status: 'error',
            message: errorMessage
          });
        }
      }
    }

    const summary = {
      dryRun,
      updateDatabase,
      bucketsProcessed: bucketsToProcess,
      totalFiles: results.length,
      successful: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    };

    console.log(`Migration complete - ${summary.successful} successful, ${summary.errors} errors`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in migrate-to-r2 function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function uploadToR2(
  file: Blob,
  key: string,
  contentType: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string
): Promise<void> {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
  
  const fileBuffer = await file.arrayBuffer();
  
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Authorization': `Bearer ${accessKeyId}:${secretAccessKey}`,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }
}

async function updateDatabaseUrls(
  supabase: any,
  bucket: string,
  filename: string,
  oldUrl: string,
  newUrl: string
): Promise<void> {
  try {
    // Update posts table
    if (bucket === 'posts') {
      await supabase
        .from('posts')
        .update({ image_url: newUrl })
        .eq('image_url', oldUrl);
    }
    
    if (bucket === 'videos') {
      await supabase
        .from('posts')
        .update({ video_url: newUrl })
        .eq('video_url', oldUrl);
    }

    // Update avatars and covers in profiles
    if (bucket === 'avatars') {
      await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('avatar_url', oldUrl);
        
      await supabase
        .from('profiles')
        .update({ cover_url: newUrl })
        .eq('cover_url', oldUrl);
    }

    // Update comment media
    if (bucket === 'comment-media') {
      await supabase
        .from('comments')
        .update({ image_url: newUrl })
        .eq('image_url', oldUrl);
        
      await supabase
        .from('comments')
        .update({ video_url: newUrl })
        .eq('video_url', oldUrl);
    }

    console.log(`Updated database URLs for ${bucket}/${filename}`);
  } catch (error) {
    console.error(`Error updating database URLs:`, error);
    throw error;
  }
}
