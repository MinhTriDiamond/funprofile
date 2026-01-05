import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, code } = await req.json();

    console.log(`[OTP-VERIFY] Verifying OTP for: ${identifier}`);

    if (!identifier || !code) {
      console.error('[OTP-VERIFY] Missing identifier or code');
      return new Response(
        JSON.stringify({ success: false, error: 'Identifier and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('identifier', identifier.toLowerCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.error('[OTP-VERIFY] No valid OTP found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'OTP expired or not found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      console.error('[OTP-VERIFY] Max attempts exceeded');
      // Mark as used to prevent further attempts
      await supabase
        .from('otp_codes')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (otpRecord.code !== code) {
      console.log('[OTP-VERIFY] Invalid OTP code');
      // Increment attempts
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP code',
          attempts_remaining: otpRecord.max_attempts - otpRecord.attempts - 1
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[OTP-VERIFY] OTP verified successfully');

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    // Determine user email
    const userEmail = otpRecord.type === 'email' 
      ? identifier.toLowerCase() 
      : `${identifier.replace(/[^0-9]/g, '')}@phone.local`;

    // Helper: find user by email via pagination (Auth admin API has no direct lookup)
    const findUserByEmail = async (email: string) => {
      const target = email.toLowerCase();
      const perPage = 1000;
      const maxPages = 10;

      for (let page = 1; page <= maxPages; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const found = data?.users?.find((u) => u.email?.toLowerCase() === target);
        if (found) return found;

        // Stop early if we reached the end.
        if (!data?.users || data.users.length < perPage) break;
      }

      return null;
    };

    // Check if user exists
    let user = await findUserByEmail(userEmail);

    let isNewUser = false;

    if (!user) {
      console.log('[OTP-VERIFY] Creating new user for:', userEmail);
      isNewUser = true;
      
      // Generate unique username from identifier
      const baseUsername = identifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const uniqueSuffix = Date.now().toString(36).slice(-4);
      const username = `${baseUsername}${uniqueSuffix}`;

      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          username: username,
          registered_from: 'otp',
          identifier: identifier.toLowerCase()
        }
      });

      if (createError) {
        // If email exists error, user was created between our check - fetch it reliably
        if (
          createError.message?.includes('already been registered') ||
          (createError as any).code === 'email_exists'
        ) {
          console.log('[OTP-VERIFY] User already exists (race condition), fetching user...');
          user = await findUserByEmail(userEmail);
          if (!user) {
            console.error('[OTP-VERIFY] User exists but could not be retrieved');
            return new Response(
              JSON.stringify({ success: false, error: 'User exists but could not be retrieved' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('[OTP-VERIFY] Failed to create user:', createError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to create user account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        user = newUser.user;
      }
    } else {
      console.log('[OTP-VERIFY] Found existing user:', user.id);
      isNewUser = false;
    }

    // Update last login platform
    if (user) {
      await supabase
        .from('profiles')
        .update({ last_login_platform: 'otp_email' })
        .eq('id', user.id);
    }

    // Generate session for user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (sessionError) {
      console.error('[OTP-VERIFY] Failed to generate session:', sessionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[OTP-VERIFY] Session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP verified successfully',
        user_id: user?.id,
        is_new_user: isNewUser,
        magic_link: sessionData?.properties?.action_link
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OTP-VERIFY] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
