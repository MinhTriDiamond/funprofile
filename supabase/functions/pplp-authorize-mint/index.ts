import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/pplp-helper.ts";
import { calculateCascadeDistribution } from "../_shared/pplp-types.ts";
import { CONTRACT_ADDRESS, BSC_TESTNET_RPCS, LOCK_WITH_PPLP_ABI, ATTESTER_ADDRESSES } from "../_shared/pplp-eip712.ts";
import { hashForEvidence } from "../_shared/pplp-crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Auth + Admin check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action_ids, recipient_address, action_name = 'light_action' } = body;

    if (!action_ids || !Array.isArray(action_ids) || action_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'action_ids array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!recipient_address) {
      return new Response(JSON.stringify({ error: 'recipient_address required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP Authorize] Processing ${action_ids.length} actions for ${recipient_address}`);

    // Fetch scored actions with pass decision
    const { data: actions, error: fetchErr } = await supabase
      .from('pplp_actions')
      .select(`
        id, actor_id, action_type, evidence_hash,
        pplp_scores!inner(final_reward, decision)
      `)
      .in('id', action_ids)
      .eq('status', 'scored');

    if (fetchErr || !actions || actions.length === 0) {
      return new Response(JSON.stringify({ error: 'No eligible scored actions found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter to only passed actions
    const passedActions = actions.filter((a: any) => a.pplp_scores?.decision === 'pass');
    if (passedActions.length === 0) {
      return new Response(JSON.stringify({ error: 'No actions with pass decision' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate total reward
    const totalReward = passedActions.reduce((sum: number, a: any) => sum + (a.pplp_scores?.final_reward || 0), 0);
    const distribution = calculateCascadeDistribution(totalReward);

    // Get actor_id (should all be same user)
    const actorId = passedActions[0].actor_id;

    // Get nonce
    const { data: nonceData } = await supabase.rpc('get_next_nonce', { _user_id: actorId });
    const nonce = nonceData?.toString() || '0';

    // Generate evidence hash from action types
    const actionTypes = passedActions.map((a: any) => a.action_type);
    const evidenceHash = await hashForEvidence(actionTypes);

    // Create mint request in DB FIRST (early save for resilience)
    const { data: mintReq, error: mintErr } = await supabase
      .from('pplp_mint_requests')
      .insert({
        user_id: actorId,
        recipient_address,
        amount_wei: (BigInt(distribution.user_amount) * BigInt(10 ** 18)).toString(),
        amount_display: distribution.user_amount,
        evidence_hash: '0x' + evidenceHash,
        action_ids: passedActions.map((a: any) => a.id),
        action_types: actionTypes,
        action_name,
        action_hash: null, // Will be computed on frontend via keccak256
        nonce: parseInt(nonce),
        status: 'pending_sig',
      })
      .select('id')
      .single();

    if (mintErr) {
      console.error('[PPLP Authorize] Mint request insert error:', mintErr);
      throw mintErr;
    }

    // Log distribution
    await supabase.from('fun_distribution_logs').insert({
      action_id: passedActions.map((a: any) => a.id).join(','),
      actor_id: actorId,
      mint_request_id: mintReq.id,
      total_reward: distribution.total_reward,
      user_amount: distribution.user_amount,
      user_percentage: distribution.user_percentage,
      genesis_amount: distribution.genesis_amount,
      platform_amount: distribution.platform_amount,
      partners_amount: distribution.partners_amount,
    });

    // Mark actions as having a mint request
    await supabase
      .from('pplp_actions')
      .update({ mint_request_hash: mintReq.id, status: 'minted' })
      .in('id', passedActions.map((a: any) => a.id));

    console.log(`[PPLP Authorize] Created mint request ${mintReq.id}, total=${totalReward}, user=${distribution.user_amount}`);

    return new Response(JSON.stringify({
      success: true,
      mint_request_id: mintReq.id,
      total_reward: totalReward,
      distribution,
      nonce,
      evidence_hash: '0x' + evidenceHash,
      actions_count: passedActions.length,
      eip712_data: {
        recipient: recipient_address,
        amount: (BigInt(distribution.user_amount) * BigInt(10 ** 18)).toString(),
        action_name,
        nonce,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[PPLP Authorize] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
