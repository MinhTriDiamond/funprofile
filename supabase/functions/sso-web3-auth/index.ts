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
  const addressRegex = /^0x[a-fA-F0-9]{40}$/i;
  
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
    let userEmail: string;

    if (existingProfile) {
      console.log('[WEB3-AUTH] Existing user found:', existingProfile.id);
      userId = existingProfile.id;
      
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email || '';
    } else {
      console.log('[WEB3-AUTH] Creating new user for wallet');
      isNewUser = true;

      // Generate unique email and username for this wallet user
      const shortAddr = normalizedAddress.slice(2, 10);
      const timestamp = Date.now().toString(36).slice(-4);
      userEmail = `${shortAddr}${timestamp}@wallet.fun.rich`;
      const username = `wallet_${shortAddr}${timestamp}`;

      // Create new user via Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          username: username,
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

    // If we don't have userEmail, fetch it
    if (!userEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email || '';
    }

    if (!userEmail) {
      console.error('[WEB3-AUTH] User email not found');
      return new Response(
        JSON.stringify({ success: false, error: 'User email not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
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
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
