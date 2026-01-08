import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get access token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('cross_platform_tokens')
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          fun_id,
          email,
          wallet_address,
          external_wallet_address,
          bio,
          soul_element,
          created_at
        )
      `)
      .eq('access_token', accessToken)
      .eq('is_revoked', false)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'invalid_token', error_description: 'Token not found or revoked' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiration
    if (new Date(tokenData.access_token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'invalid_token', error_description: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at
    await supabase
      .from('cross_platform_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    const profile = tokenData.profiles;
    const scopes = tokenData.scope || [];
    const clientId = tokenData.client_id;

    // Build response based on scopes
    const userInfo: Record<string, unknown> = {
      sub: profile.id, // Standard OIDC claim
      fun_id: profile.fun_id,
      active: true
    };

    // Profile scope - basic user info
    if (scopes.includes('profile')) {
      userInfo.username = profile.username;
      userInfo.full_name = profile.full_name;
      userInfo.avatar_url = profile.avatar_url;
      userInfo.bio = profile.bio;
      userInfo.created_at = profile.created_at;
    }

    // Email scope
    if (scopes.includes('email')) {
      userInfo.email = profile.email;
    }

    // Wallet scope
    if (scopes.includes('wallet')) {
      userInfo.wallet_address = profile.wallet_address;
      userInfo.external_wallet_address = profile.external_wallet_address;
    }

    // Soul scope - NFT/spiritual data
    if (scopes.includes('soul')) {
      userInfo.soul_element = profile.soul_element;
      
      // Get Soul NFT details
      const { data: soulNft } = await supabase
        .from('soul_nfts')
        .select('soul_element, soul_level, nft_token_id, minted_at')
        .eq('user_id', profile.id)
        .single();
      
      if (soulNft) {
        userInfo.soul_nft = soulNft;
      }
    }

    // Rewards scope
    if (scopes.includes('rewards')) {
      const { data: rewardData } = await supabase
        .from('profiles')
        .select('pending_reward, approved_reward, claimed_reward, reward_status')
        .eq('id', profile.id)
        .single();
      
      if (rewardData) {
        userInfo.rewards = rewardData;
      }
    }

    // Platform data scope - CHỈ trả về data của platform đang call (tách biệt hoàn toàn)
    if (scopes.includes('platform_data')) {
      const { data: platformData } = await supabase
        .from('platform_user_data')
        .select('data, synced_at, sync_count, last_sync_mode, client_timestamp')
        .eq('user_id', profile.id)
        .eq('client_id', clientId) // Chỉ lấy data của platform này, không thể đọc data platform khác
        .single();
      
      if (platformData) {
        userInfo.platform_data = {
          data: platformData.data,
          synced_at: platformData.synced_at,
          sync_count: platformData.sync_count,
          last_sync_mode: platformData.last_sync_mode,
          client_timestamp: platformData.client_timestamp
        };
      } else {
        userInfo.platform_data = null;
      }
    }

    // Token metadata
    userInfo.token_info = {
      client_id: clientId,
      scope: scopes,
      expires_at: tokenData.access_token_expires_at
    };

    return new Response(
      JSON.stringify(userInfo),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('SSO Verify error:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
