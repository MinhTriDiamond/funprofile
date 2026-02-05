 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     // Get auth token
     const authHeader = req.headers.get('Authorization');
     if (!authHeader) {
       return new Response(JSON.stringify({ error: 'No authorization header' }), {
         status: 401,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claimsData?.claims?.sub) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), {
         status: 401,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
    const userId = claimsData.claims.sub;
    console.log(`[PPLP] Getting light score for user ${userId}`);
 
     // Call the RPC function to get user light score
     const { data, error } = await supabase.rpc('get_user_light_score', {
      p_user_id: userId
     });
 
     if (error) {
       console.error('[PPLP] RPC error:', error);
       return new Response(JSON.stringify({ error: 'Failed to get light score' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Get current epoch stats
     const today = new Date().toISOString().split('T')[0];
     const { data: epochData } = await supabase
       .from('mint_epochs')
       .select('*')
       .eq('epoch_date', today)
       .single();
 
     return new Response(JSON.stringify({
       success: true,
       data: {
         ...data,
         epoch: epochData || {
           epoch_date: today,
           total_minted: 0,
           total_cap: 10000000,
         },
       },
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error: unknown) {
     console.error('[PPLP] Error:', error);
     const message = error instanceof Error ? error.message : 'Unknown error';
     return new Response(JSON.stringify({ error: message }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });