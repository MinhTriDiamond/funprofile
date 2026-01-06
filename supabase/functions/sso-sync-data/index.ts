import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const SYNC_RATE_LIMIT = 60; // 60 requests per minute per client
const USER_RATE_LIMIT = 120; // 120 total syncs per minute per user
const RATE_WINDOW = 60 * 1000; // 1 minute

// Rate limit maps
const clientRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const userRateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Validation configuration
const validationRules = {
  maxDataSize: 50 * 1024, // 50KB
  maxDepth: 5,
  allowedCategories: {
    'fun_farm_client': ['stats', 'inventory', 'achievements', 'settings', 'farming_level', 'total_harvest', 'crops', 'animals'],
    'fun_play_client': ['gaming_stats', 'scores', 'achievements', 'preferences', 'games_played', 'high_scores', 'badges'],
    'fun_planet_client': ['social_stats', 'interactions', 'achievements', 'settings', 'followers', 'posts', 'reactions']
  } as Record<string, string[]>,
  reservedKeys: ['user_id', 'fun_id', 'wallet_address', 'soul_nft', 'id', 'created_at', 'updated_at']
};

// Check rate limit
function checkRateLimit(key: string, map: Map<string, { count: number; resetAt: number }>, limit: number): boolean {
  const now = Date.now();
  const record = map.get(key);
  
  if (!record || now > record.resetAt) {
    map.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// Get object depth
function getObjectDepth(obj: any, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return currentDepth;
  }
  
  let maxDepth = currentDepth;
  for (const key in obj) {
    const depth = getObjectDepth(obj[key], currentDepth + 1);
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

// Check for reserved keys
function hasReservedKeys(obj: any, reservedKeys: string[]): string | null {
  if (typeof obj !== 'object' || obj === null) return null;
  
  for (const key in obj) {
    if (reservedKeys.includes(key.toLowerCase())) {
      return key;
    }
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const found = hasReservedKeys(obj[key], reservedKeys);
      if (found) return found;
    }
  }
  return null;
}

// Deep merge function
function deepMerge(target: any, source: any, mode: string): any {
  if (mode === 'replace') {
    return source;
  }
  
  if (mode === 'append') {
    const result = { ...target };
    for (const key in source) {
      if (!(key in result)) {
        result[key] = source[key];
      } else if (Array.isArray(source[key]) && Array.isArray(result[key])) {
        // Append unique items to arrays
        result[key] = [...new Set([...result[key], ...source[key]])];
      }
      // Skip existing non-array keys in append mode
    }
    return result;
  }
  
  // Default: merge mode
  const result = { ...target };
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key], mode);
    } else if (Array.isArray(source[key])) {
      // Merge arrays, keep unique values
      const existing = Array.isArray(result[key]) ? result[key] : [];
      result[key] = [...new Set([...existing, ...source[key]])];
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract and validate token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Missing or invalid Authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = authHeader.substring(7);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token and get user info
    const { data: tokenData, error: tokenError } = await supabase
      .from('cross_platform_tokens')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          fun_id,
          cross_platform_data
        )
      `)
      .eq('access_token', accessToken)
      .eq('is_revoked', false)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Token not found or revoked'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check token expiration
    if (new Date(tokenData.access_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Token has expired'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const clientId = tokenData.client_id;
    const userId = tokenData.user_id;
    const profile = tokenData.profiles;

    // Check client rate limit
    if (!checkRateLimit(clientId, clientRateLimitMap, SYNC_RATE_LIMIT)) {
      return new Response(JSON.stringify({
        error: 'rate_limit_exceeded',
        error_description: 'Client rate limit exceeded. Maximum 60 syncs per minute.',
        retry_after: 60
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    // Check user rate limit
    if (!checkRateLimit(userId, userRateLimitMap, USER_RATE_LIMIT)) {
      return new Response(JSON.stringify({
        error: 'rate_limit_exceeded',
        error_description: 'User rate limit exceeded. Maximum 120 syncs per minute across all platforms.',
        retry_after: 60
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sync_mode = 'merge', data, categories, client_timestamp } = body;

    // Validate sync_mode
    if (!['merge', 'replace', 'append'].includes(sync_mode)) {
      return new Response(JSON.stringify({
        error: 'validation_failed',
        error_description: 'Invalid sync_mode. Must be "merge", "replace", or "append"'
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate data exists
    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing or invalid data field'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check data size
    const dataSize = new TextEncoder().encode(JSON.stringify(data)).length;
    if (dataSize > validationRules.maxDataSize) {
      return new Response(JSON.stringify({
        error: 'payload_too_large',
        error_description: 'Data exceeds maximum allowed size',
        details: {
          max_size: validationRules.maxDataSize,
          actual_size: dataSize
        }
      }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check object depth
    const depth = getObjectDepth(data);
    if (depth > validationRules.maxDepth) {
      return new Response(JSON.stringify({
        error: 'validation_failed',
        error_description: `Data exceeds maximum nesting depth of ${validationRules.maxDepth}`,
        details: { max_depth: validationRules.maxDepth, actual_depth: depth }
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for reserved keys
    const reservedKey = hasReservedKeys(data, validationRules.reservedKeys);
    if (reservedKey) {
      return new Response(JSON.stringify({
        error: 'validation_failed',
        error_description: `Reserved key "${reservedKey}" cannot be synced`,
        details: { reserved_keys: validationRules.reservedKeys }
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get existing cross_platform_data
    const existingData = profile?.cross_platform_data || {};
    const existingClientData = existingData[clientId]?.data || {};

    // Apply merge logic
    const mergedData = deepMerge(existingClientData, data, sync_mode);

    // Build updated cross_platform_data
    const syncedAt = new Date().toISOString();
    const syncCount = (existingData[clientId]?.sync_count || 0) + 1;
    
    const updatedCrossPlatformData = {
      ...existingData,
      [clientId]: {
        data: mergedData,
        synced_at: syncedAt,
        sync_count: syncCount,
        last_sync_mode: sync_mode,
        client_timestamp: client_timestamp || null
      }
    };

    // Update database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ cross_platform_data: updatedCrossPlatformData })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({
        error: 'server_error',
        error_description: 'Failed to sync data'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update token last_used_at
    await supabase
      .from('cross_platform_tokens')
      .update({ last_used_at: syncedAt })
      .eq('id', tokenData.id);

    // Determine categories updated
    const categoriesUpdated = categories || Object.keys(data);

    console.log(`[sso-sync-data] Synced data for user ${userId} from ${clientId}. Mode: ${sync_mode}, Size: ${dataSize} bytes`);

    return new Response(JSON.stringify({
      success: true,
      synced_at: syncedAt,
      sync_mode: sync_mode,
      sync_count: syncCount,
      categories_updated: categoriesUpdated,
      data_size: dataSize,
      user: {
        fun_id: profile?.fun_id,
        username: profile?.username
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in sso-sync-data:', error);
    return new Response(JSON.stringify({
      error: 'server_error',
      error_description: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

