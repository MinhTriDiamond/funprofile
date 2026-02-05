 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // FUN Money Contract on BSC Testnet
 const FUN_MONEY_CONTRACT = '0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2';
 const CHAIN_ID = 97; // BSC Testnet
 
 // EIP-712 Domain
 const DOMAIN = {
   name: 'FUN Money',
   version: '1',
   chainId: CHAIN_ID,
   verifyingContract: FUN_MONEY_CONTRACT,
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

     const { action_ids } = await req.json();
 
     if (!action_ids || !Array.isArray(action_ids) || action_ids.length === 0) {
       return new Response(JSON.stringify({ error: 'action_ids required' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
    console.log(`[PPLP-MINT] Processing mint for user ${userId}, actions: ${action_ids.length}`);
 
     // Get user wallet address
     const { data: profile } = await supabase
       .from('profiles')
       .select('custodial_wallet_address, external_wallet_address, default_wallet_type')
      .eq('id', userId)
       .single();
 
     const walletAddress = profile?.default_wallet_type === 'external' 
       ? profile?.external_wallet_address 
       : profile?.custodial_wallet_address;
 
     if (!walletAddress) {
       return new Response(JSON.stringify({ error: 'No wallet address configured' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Get approved actions
     const { data: actions, error: actionsError } = await supabase
       .from('light_actions')
       .select('*')
       .in('id', action_ids)
      .eq('user_id', userId)
       .eq('mint_status', 'approved')
       .eq('is_eligible', true);
 
     if (actionsError || !actions || actions.length === 0) {
       return new Response(JSON.stringify({ error: 'No eligible actions found' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Check user daily cap
     const { data: reputation } = await supabase
       .from('light_reputation')
       .select('*')
      .eq('user_id', userId)
       .single();
 
     const today = new Date().toISOString().split('T')[0];
     const todayMinted = reputation?.today_date === today ? (reputation?.today_minted || 0) : 0;
     const dailyCap = reputation?.daily_mint_cap || 500;
     const remainingCap = dailyCap - todayMinted;
 
     // Calculate total amount to mint
     let totalAmount = actions.reduce((sum, a) => sum + (a.mint_amount || 0), 0);
     
     if (totalAmount > remainingCap) {
       totalAmount = remainingCap;
       console.log(`[PPLP-MINT] Capping mint to ${totalAmount} due to daily limit`);
     }
 
     if (totalAmount <= 0) {
       return new Response(JSON.stringify({ error: 'Daily mint cap reached' }), {
         status: 429,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Check epoch cap
     const { data: epoch } = await supabase
       .from('mint_epochs')
       .select('*')
       .eq('epoch_date', today)
       .single();
 
     const epochMinted = epoch?.total_minted || 0;
     const epochCap = epoch?.total_cap || 10000000;
     
     if (epochMinted + totalAmount > epochCap) {
       return new Response(JSON.stringify({ error: 'Global epoch cap reached' }), {
         status: 429,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Generate mint data for signature
     // NOTE: In production, this would be signed by the attester's private key
     // For now, we prepare the data that the attester (bé Trí) would sign
     const nonce = Date.now();
     const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
     const amountWei = BigInt(totalAmount) * BigInt(10 ** 18);
 
     const mintData = {
       to: walletAddress,
       amount: amountWei.toString(),
       nonce,
       deadline,
       domain: DOMAIN,
       contract: FUN_MONEY_CONTRACT,
       chainId: CHAIN_ID,
     };
 
     // For now, we'll mark actions as "pending_signature" 
     // The actual on-chain mint will happen when attester signs
     const actionIdsToUpdate = actions.slice(0, Math.ceil(totalAmount / 10)).map(a => a.id);
     
     const { error: updateError } = await supabase
       .from('light_actions')
       .update({ 
         mint_status: 'minted',
         tx_hash: `pending_${nonce}`, // Placeholder until actual tx
         minted_at: new Date().toISOString(),
       })
       .in('id', actionIdsToUpdate);
 
     if (updateError) {
       console.error('[PPLP-MINT] Update error:', updateError);
       return new Response(JSON.stringify({ error: 'Failed to update actions' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     console.log(`[PPLP-MINT] Prepared mint for ${totalAmount} FUN to ${walletAddress}`);
 
     return new Response(JSON.stringify({
       success: true,
       mint: {
         amount: totalAmount,
         wallet: walletAddress,
         actions_count: actionIdsToUpdate.length,
         mint_data: mintData,
         message: 'Mint prepared. Awaiting on-chain confirmation.',
       },
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error: unknown) {
     console.error('[PPLP-MINT] Error:', error);
     const message = error instanceof Error ? error.message : 'Unknown error';
     return new Response(JSON.stringify({ error: message }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });