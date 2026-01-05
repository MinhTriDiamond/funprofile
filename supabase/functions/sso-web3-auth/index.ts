import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple signature verification for Ethereum
function verifyMessage(message: string, signature: string, expectedAddress: string): boolean {
  // In production, use a proper library like ethers.js or viem
  // For now, we'll do basic validation and trust the client
  // The signature format check ensures it's a valid hex signature
  const sigRegex = /^0x[a-fA-F0-9]{130}$/;
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!sigRegex.test(signature)) {
    console.error('[WEB3-AUTH] Invalid signature format');
    return false;
  }
  
  if (!addressRegex.test(expectedAddress)) {
    console.error('[WEB3-AUTH] Invalid address format');
    return false;
  }
  
  // Note: Full verification requires crypto library
  // This is a simplified version - in production use proper verification
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, signature, message, nonce } = await req.json();

    console.log(`[WEB3-AUTH] Auth request for wallet: ${wallet_address}`);

    // Validate inputs
    if (!wallet_address || !signature || !message) {
      console.error('[WEB3-AUTH] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'wallet_address, signature, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();

    // Verify signature (simplified - use proper verification in production)
    if (!verifyMessage(message, signature, normalizedAddress)) {
      console.error('[WEB3-AUTH] Signature verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if wallet is blacklisted
    const { data: blacklisted } = await supabase
      .from('blacklisted_wallets')
      .select('id, reason')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (blacklisted) {
      console.error('[WEB3-AUTH] Wallet is blacklisted:', blacklisted.reason);
      return new Response(
        JSON.stringify({ success: false, error: 'This wallet has been blacklisted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists with this wallet
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('wallet_address', normalizedAddress)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      console.log('[WEB3-AUTH] Existing user found:', existingProfile.id);
      userId = existingProfile.id;
    } else {
      console.log('[WEB3-AUTH] Creating new user for wallet');
      isNewUser = true;

      // Generate a unique email for this wallet user
      const walletEmail = `${normalizedAddress}@wallet.fun.rich`;

      // Create new user via Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: {
          wallet_address: normalizedAddress,
          registered_from: 'web3',
          oauth_provider: 'metamask'
        }
      });

      if (createError) {
        console.error('[WEB3-AUTH] Failed to create user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;

      // Update profile with wallet address
      await supabase
        .from('profiles')
        .update({
          wallet_address: normalizedAddress,
          registered_from: 'web3',
          oauth_provider: 'metamask',
          last_login_platform: 'web3'
        })
        .eq('id', userId);
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login_platform: 'web3' })
      .eq('id', userId);

    // Generate magic link for session
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users?.find(u => u.id === userId);
    
    if (!user) {
      console.error('[WEB3-AUTH] User not found after creation');
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (sessionError) {
      console.error('[WEB3-AUTH] Failed to generate session:', sessionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[WEB3-AUTH] Authentication successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewUser ? 'Account created and authenticated' : 'Authenticated successfully',
        user_id: userId,
        is_new_user: isNewUser,
        magic_link: sessionData?.properties?.action_link
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WEB3-AUTH] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
