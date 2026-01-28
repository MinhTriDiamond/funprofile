import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DISCONNECT-WALLET] Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create client with anon key to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[DISCONNECT-WALLET] Unauthorized:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DISCONNECT-WALLET] Request from user: ${user.id}`);

    // 3. Create Supabase client with service role for privileged operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Get current profile to check if there's an external wallet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('external_wallet_address, custodial_wallet_address')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[DISCONNECT-WALLET] Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.external_wallet_address) {
      console.warn('[DISCONNECT-WALLET] No external wallet to disconnect');
      return new Response(
        JSON.stringify({ success: false, error: 'No external wallet connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const disconnectedAddress = profile.external_wallet_address;

    // 5. Update profile to remove external wallet and set default to custodial
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        external_wallet_address: null,
        wallet_address: profile.custodial_wallet_address || null, // Keep custodial as legacy wallet_address
        default_wallet_type: 'custodial',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[DISCONNECT-WALLET] Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to disconnect wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DISCONNECT-WALLET] External wallet disconnected successfully:', disconnectedAddress);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'External wallet disconnected successfully',
        disconnected_address: disconnectedAddress
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DISCONNECT-WALLET] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
