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

    // Check if user exists, if not create one
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userEmail = otpRecord.type === 'email' ? identifier.toLowerCase() : `${identifier}@phone.local`;
    
    let user = existingUser?.users?.find(u => u.email === userEmail);
    
    if (!user) {
      console.log('[OTP-VERIFY] Creating new user for:', userEmail);
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          registered_from: 'otp',
          identifier: identifier.toLowerCase()
        }
      });

      if (createError) {
        console.error('[OTP-VERIFY] Failed to create user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = newUser.user;
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
        magic_link: sessionData?.properties?.action_link
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OTP-VERIFY] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
