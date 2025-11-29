const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, key, contentType } = await req.json();

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID');
    const CLOUDFLARE_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    // Decode base64 file
    const binaryString = atob(file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // AWS Signature V4 for R2
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = 'auto';
    const service = 's3';
    const host = `${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    // Calculate payload hash (SHA256 of the file content)
    const payloadHashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const payloadHash = Array.from(new Uint8Array(payloadHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Canonical request components
    const method = 'PUT';
    const canonicalUri = `/${CLOUDFLARE_R2_BUCKET_NAME}/${key}`;
    const canonicalQueryString = '';
    
    // Headers must be in alphabetical order
    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`
    ].join('\n') + '\n';
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    
    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    
    const canonicalRequestHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(canonicalRequest)
    );
    const canonicalRequestHash = Array.from(new Uint8Array(canonicalRequestHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');
    
    // Calculate signature
    const signingKey = await getSignatureKey(
      CLOUDFLARE_SECRET_ACCESS_KEY,
      dateStamp,
      region,
      service
    );
    
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Authorization header
    const authorizationHeader = `${algorithm} Credential=${CLOUDFLARE_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Make the request
    const endpoint = `https://${host}/${CLOUDFLARE_R2_BUCKET_NAME}/${key}`;
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: bytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const url = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    console.log(`Successfully uploaded to R2: ${key}`);

    return new Response(
      JSON.stringify({ url, key }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in upload-to-r2 function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}
