import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequestBody {
  client_id: string;
  client_secret: string;
  email: string;
  source_user_id?: string;
  source_username?: string;
  platform_data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: MergeRequestBody = await req.json();
    const { client_id, client_secret, email, source_user_id, source_username, platform_data } = body;

    console.log('[sso-merge-request] Received request:', { client_id, email, source_user_id });

    // Validate required fields
    if (!client_id || !client_secret || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: client_id, client_secret, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OAuth client
    const { data: oauthClient, error: clientError } = await supabase
      .from('oauth_clients')
      .select('client_id, client_name, is_active, platform_name')
      .eq('client_id', client_id)
      .eq('client_secret', client_secret)
      .eq('is_active', true)
      .single();

    if (clientError || !oauthClient) {
      console.error('[sso-merge-request] Invalid client credentials:', clientError);
      return new Response(
        JSON.stringify({ error: 'Invalid client credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sso-merge-request] Client verified:', oauthClient.client_name);

    // Check if email exists in Fun Profile (auth.users)
    const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('[sso-merge-request] Error checking users:', userCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailLower = email.toLowerCase();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === emailLower
    );

    // Determine merge type
    let mergeType: 'both_exist' | 'farm_only' | 'profile_only';
    let targetUserId: string | null = null;

    if (existingUser) {
      // Email exists in Fun Profile
      mergeType = 'both_exist';
      targetUserId = existingUser.id;
      console.log('[sso-merge-request] User exists in Fun Profile:', targetUserId);
    } else {
      // Email only exists in source platform (Fun Farm)
      mergeType = 'farm_only';
      console.log('[sso-merge-request] User only exists in source platform');
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('account_merge_requests')
      .select('id, status')
      .eq('email', emailLower)
      .eq('source_platform', oauthClient.platform_name || client_id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      console.log('[sso-merge-request] Existing request found:', existingRequest);
      return new Response(
        JSON.stringify({
          error: 'Merge request already exists',
          request_id: existingRequest.id,
          status: existingRequest.status
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create merge request
    const { data: mergeRequest, error: insertError } = await supabase
      .from('account_merge_requests')
      .insert({
        email: emailLower,
        source_platform: oauthClient.platform_name || client_id,
        source_user_id: source_user_id || null,
        source_username: source_username || null,
        target_platform: 'fun_profile',
        target_user_id: targetUserId,
        platform_data: platform_data || {},
        merge_type: mergeType,
        status: 'pending'
      })
      .select('id, status, merge_type, created_at')
      .single();

    if (insertError) {
      console.error('[sso-merge-request] Error creating merge request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create merge request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sso-merge-request] Merge request created:', mergeRequest);

    // TODO: Send notification to admins (can be done via webhook or in-app notification)

    return new Response(
      JSON.stringify({
        success: true,
        request_id: mergeRequest.id,
        merge_type: mergeRequest.merge_type,
        status: mergeRequest.status,
        message: mergeType === 'both_exist' 
          ? 'User exists on both platforms. Admin review required.'
          : 'User only exists on source platform. Admin will create new account.',
        created_at: mergeRequest.created_at
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sso-merge-request] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
