import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keccak256, toBytes } from "https://esm.sh/viem@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUN_MONEY_CONTRACT = '0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const DEFAULT_ACTION_NAME = 'light_action';

async function getNonceFromContract(address: string): Promise<bigint> {
  try {
    const functionSelector = keccak256(toBytes('nonces(address)')).slice(0, 10);
    const paddedAddress = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
    const data = functionSelector + paddedAddress.slice(2);

    const response = await fetch(BSC_TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: FUN_MONEY_CONTRACT, data }, 'latest'],
      }),
    });

    const result = await response.json();
    if (result.error) return 0n;
    return BigInt(result.result || '0x0');
  } catch {
    return 0n;
  }
}

function generateEvidenceHash(actionTypes: string[], userId: string, timestamp: number): string {
  const input = `${actionTypes.sort().join(',')}:${userId}:${timestamp}`;
  return keccak256(toBytes(input));
}

function generateActionHash(actionName: string): string {
  return keccak256(toBytes(actionName));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin check
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: 1 request per minute per admin
    const { data: rateLimit } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `admin_batch_mint:${user.id}`,
      p_limit: 1,
      p_window_ms: 60000,
    });

    if (rateLimit && !rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait 1 minute between batch operations.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[BATCH-MINT] Admin ${user.id} triggered batch mint request creation`);

    // Step 1: Get all rejected mint requests
    const { data: rejectedRequests } = await supabaseAdmin
      .from('pplp_mint_requests')
      .select('id, action_ids')
      .eq('status', 'rejected');

    const rejectedCount = rejectedRequests?.length || 0;
    console.log(`[BATCH-MINT] Found ${rejectedCount} rejected requests to clean up`);

    // Step 2: Reset light_actions from rejected requests
    if (rejectedRequests && rejectedRequests.length > 0) {
      const allActionIds = rejectedRequests.flatMap(r => r.action_ids || []);
      if (allActionIds.length > 0) {
        await supabaseAdmin
          .from('light_actions')
          .update({ mint_status: 'approved', mint_request_id: null })
          .in('id', allActionIds);
        console.log(`[BATCH-MINT] Reset ${allActionIds.length} light_actions from rejected requests`);
      }

      // Delete rejected requests
      const rejectedIds = rejectedRequests.map(r => r.id);
      await supabaseAdmin
        .from('pplp_mint_requests')
        .delete()
        .in('id', rejectedIds);
      console.log(`[BATCH-MINT] Deleted ${rejectedIds.length} rejected mint requests`);
    }

    // Step 3: Also reset any remaining light_actions stuck in rejected
    await supabaseAdmin
      .from('light_actions')
      .update({ mint_status: 'approved', mint_request_id: null })
      .eq('mint_status', 'rejected');

    // Step 4: Find all users with approved+eligible actions
    const { data: eligibleActions, error: actionsError } = await supabaseAdmin
      .from('light_actions')
      .select('id, user_id, action_type, mint_amount')
      .eq('mint_status', 'approved')
      .eq('is_eligible', true)
      .is('mint_request_id', null);

    if (actionsError || !eligibleActions || eligibleActions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        summary: { rejected_cleaned: rejectedCount, created: 0, skipped_no_wallet: 0, total_actions_reset: 0 },
        message: 'Đã dọn dẹp requests từ chối. Không có actions mới để tạo mint request.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group actions by user
    const userActionsMap: Record<string, typeof eligibleActions> = {};
    for (const action of eligibleActions) {
      if (!userActionsMap[action.user_id]) userActionsMap[action.user_id] = [];
      userActionsMap[action.user_id].push(action);
    }

    const userIds = Object.keys(userActionsMap);
    console.log(`[BATCH-MINT] Found ${userIds.length} users with eligible actions`);

    // Step 5: Get wallet addresses for all users
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, public_wallet_address, wallet_address')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    let created = 0;
    let skippedNoWallet = 0;
    const errors: string[] = [];
    const actionHash = generateActionHash(DEFAULT_ACTION_NAME);
    const now = Date.now();

    // Step 6: Create mint request for each eligible user
    for (const userId of userIds) {
      const profile = profileMap.get(userId);
      const walletAddress = profile?.public_wallet_address || profile?.wallet_address;

      if (!walletAddress) {
        skippedNoWallet++;
        continue;
      }

      const actions = userActionsMap[userId];
      const totalAmount = actions.reduce((sum, a) => sum + (a.mint_amount || 0), 0);
      if (totalAmount <= 0) continue;

      try {
        const nonce = await getNonceFromContract(walletAddress);
        const amountWei = BigInt(Math.floor(totalAmount * 1e18)).toString();
        const actionTypes = [...new Set(actions.map(a => a.action_type))];
        const evidenceHash = generateEvidenceHash(actionTypes, userId, now);

        const { data: mintReq, error: insertError } = await supabaseAdmin
          .from('pplp_mint_requests')
          .insert({
            user_id: userId,
            recipient_address: walletAddress,
            amount_wei: amountWei,
            amount_display: totalAmount,
            action_name: DEFAULT_ACTION_NAME,
            action_hash: actionHash,
            evidence_hash: evidenceHash,
            action_types: actionTypes,
            nonce: Number(nonce),
            deadline: null,
            status: 'pending_sig',
            action_ids: actions.map(a => a.id),
          })
          .select('id')
          .single();

        if (insertError) {
          errors.push(`User ${userId}: ${insertError.message}`);
          continue;
        }

        // Update light_actions
        await supabaseAdmin
          .from('light_actions')
          .update({ mint_status: 'pending_sig', mint_request_id: mintReq.id })
          .in('id', actions.map(a => a.id));

        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${userId}: ${msg}`);
      }
    }

    console.log(`[BATCH-MINT] Complete: created=${created}, skipped=${skippedNoWallet}, errors=${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        rejected_cleaned: rejectedCount,
        created,
        skipped_no_wallet: skippedNoWallet,
        total_eligible_users: userIds.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
      message: `Đã tạo ${created} mint requests mới. ${skippedNoWallet} users bỏ qua (chưa có ví).`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[BATCH-MINT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
