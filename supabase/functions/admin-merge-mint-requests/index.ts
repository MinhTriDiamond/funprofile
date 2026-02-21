import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keccak256, toBytes } from "https://esm.sh/viem@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUN_MONEY_CONTRACT = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6';
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

    // Rate limiting: 1 request per minute
    const { data: rateLimit } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `admin_merge_mint:${user.id}`,
      p_limit: 1,
      p_window_ms: 60000,
    });

    if (rateLimit && !rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Vui lòng chờ 1 phút.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[MERGE-MINT] Admin ${user.id} triggered merge mint requests`);

    // Step 0: Auto-reject pending_sig requests from banned users
    const { data: bannedUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_banned', true);

    const bannedIds = (bannedUsers || []).map(u => u.id);
    let bannedRejected = 0;

    if (bannedIds.length > 0) {
      const { data: bannedRequests } = await supabaseAdmin
        .from('pplp_mint_requests')
        .select('id')
        .eq('status', 'pending_sig')
        .in('user_id', bannedIds);

      if (bannedRequests && bannedRequests.length > 0) {
        await supabaseAdmin
          .from('pplp_mint_requests')
          .update({ status: 'rejected', error_message: 'User đã bị cấm', updated_at: new Date().toISOString() })
          .in('id', bannedRequests.map(r => r.id));
        bannedRejected = bannedRequests.length;
        console.log(`[MERGE-MINT] Auto-rejected ${bannedRejected} requests from banned users`);
      }
    }

    // Step 1: Find all pending_sig requests grouped by user (excluding banned)
    const { data: allRequests, error: fetchError } = await supabaseAdmin
      .from('pplp_mint_requests')
      .select('id, user_id, recipient_address, amount_wei, amount_display, action_ids, action_types, evidence_hash, nonce')
      .eq('status', 'pending_sig')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    if (!allRequests || allRequests.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        summary: { merged_users: 0, old_requests_removed: 0, new_requests_created: 0 },
        message: 'Không có requests nào ở trạng thái pending_sig để gộp.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group by user_id
    const userRequestsMap: Record<string, typeof allRequests> = {};
    for (const req of allRequests) {
      if (!userRequestsMap[req.user_id]) userRequestsMap[req.user_id] = [];
      userRequestsMap[req.user_id].push(req);
    }

    // Only process users with more than 1 request
    const usersToMerge = Object.entries(userRequestsMap).filter(([_, reqs]) => reqs.length > 1);

    if (usersToMerge.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        summary: { merged_users: 0, old_requests_removed: 0, new_requests_created: 0, total_pending: allRequests.length },
        message: `Không có user nào có nhiều hơn 1 request. Hiện có ${allRequests.length} requests đơn lẻ.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[MERGE-MINT] Found ${usersToMerge.length} users with multiple requests to merge`);

    let mergedUsers = 0;
    let oldRequestsRemoved = 0;
    let newRequestsCreated = 0;
    const errors: string[] = [];
    const actionHash = generateActionHash(DEFAULT_ACTION_NAME);
    const now = Date.now();

    for (const [userId, requests] of usersToMerge) {
      try {
        // Compute merged values
        const walletAddress = requests[0].recipient_address;
        const allActionIds = requests.flatMap(r => r.action_ids || []);
        const allActionTypes = [...new Set(requests.flatMap(r => r.action_types || []))];
        
        // Sum amounts
        let totalDisplay = 0;
        let totalWei = 0n;
        for (const r of requests) {
          totalDisplay += r.amount_display || 0;
          totalWei += BigInt(r.amount_wei || '0');
        }

        if (totalDisplay <= 0) continue;

        // Get fresh nonce from contract
        const nonce = await getNonceFromContract(walletAddress);
        const evidenceHash = generateEvidenceHash(allActionTypes, userId, now);

        // Create new merged request
        const { data: newReq, error: insertError } = await supabaseAdmin
          .from('pplp_mint_requests')
          .insert({
            user_id: userId,
            recipient_address: walletAddress,
            amount_wei: totalWei.toString(),
            amount_display: totalDisplay,
            action_name: DEFAULT_ACTION_NAME,
            action_hash: actionHash,
            evidence_hash: evidenceHash,
            action_types: allActionTypes,
            nonce: Number(nonce),
            deadline: null,
            status: 'pending_sig',
            action_ids: allActionIds,
          })
          .select('id')
          .single();

        if (insertError) {
          errors.push(`User ${userId}: Insert failed - ${insertError.message}`);
          continue;
        }

        // Update all light_actions to point to new request
        if (allActionIds.length > 0) {
          await supabaseAdmin
            .from('light_actions')
            .update({ mint_request_id: newReq.id })
            .in('id', allActionIds);
        }

        // Delete old requests
        const oldIds = requests.map(r => r.id);
        const { error: deleteError } = await supabaseAdmin
          .from('pplp_mint_requests')
          .delete()
          .in('id', oldIds);

        if (deleteError) {
          errors.push(`User ${userId}: Delete old requests failed - ${deleteError.message}`);
          continue;
        }

        mergedUsers++;
        oldRequestsRemoved += oldIds.length;
        newRequestsCreated++;

        console.log(`[MERGE-MINT] User ${userId}: merged ${oldIds.length} requests -> 1 (${totalDisplay} FUN, ${allActionIds.length} actions)`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${userId}: ${msg}`);
      }
    }

    console.log(`[MERGE-MINT] Complete: merged=${mergedUsers}, removed=${oldRequestsRemoved}, created=${newRequestsCreated}, errors=${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        merged_users: mergedUsers,
        old_requests_removed: oldRequestsRemoved,
        new_requests_created: newRequestsCreated,
        total_pending_before: allRequests.length,
        total_pending_after: allRequests.length - oldRequestsRemoved + newRequestsCreated,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
      message: `Đã gộp requests của ${mergedUsers} users: ${oldRequestsRemoved} requests cũ → ${newRequestsCreated} requests mới.`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[MERGE-MINT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
