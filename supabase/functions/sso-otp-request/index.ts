import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, type = 'email' } = await req.json();

    console.log(`[OTP-REQUEST] Received request for: ${identifier}, type: ${type}`);

    if (!identifier) {
      console.error('[OTP-REQUEST] Missing identifier');
      return new Response(
        JSON.stringify({ success: false, error: 'Identifier is required (email or phone)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        console.error('[OTP-REQUEST] Invalid email format:', identifier);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP and expiry (5 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log(`[OTP-REQUEST] Generated OTP: ${otp} for ${identifier}`);

    // Delete any existing unused OTP for this identifier
    await supabase
      .from('otp_codes')
      .delete()
      .eq('identifier', identifier.toLowerCase())
      .eq('is_used', false);

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        identifier: identifier.toLowerCase(),
        code: otp,
        type: type,
        expires_at: expiresAt,
        is_used: false,
        attempts: 0,
        max_attempts: 5
      });

    if (insertError) {
      console.error('[OTP-REQUEST] Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In production, integrate with email/SMS service here
    // For now, we'll return success (OTP is logged for testing)
    console.log(`[OTP-REQUEST] OTP stored successfully. In production, send via email/SMS.`);
    console.log(`[OTP-REQUEST] TEST MODE - OTP for ${identifier}: ${otp}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `OTP sent to ${identifier}`,
        // Remove this in production - only for testing
        debug_otp: otp,
        expires_in_seconds: 300
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OTP-REQUEST] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
