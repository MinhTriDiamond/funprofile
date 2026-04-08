import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keccak256, toBytes } from "https://esm.sh/viem@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUN_MONEY_CONTRACT = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const DEFAULT_ACTION_NAME = 'FUN_REWARD';
const PAGE_SIZE = 1000;

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

// Fetch pending allocations from mint_allocations (epoch-based flow)
async function fetchPendingAllocations(supabaseAdmin: ReturnType<typeof createClient>) {
  const allAllocations: {
    id: string;
    user_id: string;
    epoch_id: string;
    allocation_amount_capped: number;
    light_score_total: number;
  }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('mint_allocations')
      .select('id, user_id, epoch_id, allocation_amount_capped, light_score_total')
      .eq('status', 'pending')
      .eq('is_eligible', true)
      .is('mint_request_id', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allAllocations.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allAllocations;
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

    console.log(`[BATCH-MINT] Admin ${user.id} triggered batch mint request creation (epoch-based)`);

    // Step 1: Get all rejected mint requests and clean up
    const { data: rejectedRequests } = await supabaseAdmin
      .from('pplp_mint_requests')
      .select('id, action_ids')
      .eq('status', 'rejected');

    const rejectedCount = rejectedRequests?.length || 0;
    console.log(`[BATCH-MINT] Found ${rejectedCount} rejected requests to clean up`);

    if (rejectedRequests && rejectedRequests.length > 0) {
      const allActionIds = rejectedRequests.flatMap(r => r.action_ids || []);
      if (allActionIds.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < allActionIds.length; i += CHUNK) {
          await supabaseAdmin
            .from('light_actions')
            .update({ mint_status: 'approved', mint_request_id: null })
            .in('id', allActionIds.slice(i, i + CHUNK));
        }
        console.log(`[BATCH-MINT] Reset ${allActionIds.length} light_actions from rejected requests`);
      }

      const rejectedIds = rejectedRequests.map(r => r.id);
      await supabaseAdmin
        .from('pplp_mint_requests')
        .delete()
        .in('id', rejectedIds);
      console.log(`[BATCH-MINT] Deleted ${rejectedIds.length} rejected mint requests`);
    }

    // Step 2: Reset any remaining light_actions stuck in rejected
    await supabaseAdmin
      .from('light_actions')
      .update({ mint_status: 'approved', mint_request_id: null })
      .eq('mint_status', 'rejected');

    // Step 3: Fetch pending allocations from mint_allocations (epoch-based)
    const pendingAllocations = await fetchPendingAllocations(supabaseAdmin);

    console.log(`[BATCH-MINT] Fetched ${pendingAllocations.length} pending allocations`);

    // Step 3b: Get banned user IDs to exclude
    const { data: bannedUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_banned', true);
    const bannedUserIds = new Set((bannedUsers || []).map(u => u.id));

    // Filter out banned users
    const eligibleAllocations = pendingAllocations.filter(a => !bannedUserIds.has(a.user_id));

    if (eligibleAllocations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        summary: { rejected_cleaned: rejectedCount, created: 0, skipped_no_wallet: 0, skipped_banned: pendingAllocations.length - eligibleAllocations.length },
        message: 'Đã dọn dẹp requests từ chối. Không có allocations mới để tạo mint request.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 4: Get wallet addresses for all users
    const userIds = [...new Set(eligibleAllocations.map(a => a.user_id))];
    const profiles: { id: string; public_wallet_address: string | null; wallet_address: string | null }[] = [];
    for (let i = 0; i < userIds.length; i += PAGE_SIZE) {
      const batch = userIds.slice(i, i + PAGE_SIZE);
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, public_wallet_address, wallet_address')
        .in('id', batch);
      if (data) profiles.push(...data);
    }
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    let created = 0;
    let skippedNoWallet = 0;
    let skippedZeroAmount = 0;
    const errors: string[] = [];
    const actionHash = generateActionHash(DEFAULT_ACTION_NAME);
    const now = Date.now();

    // Step 5: Create mint request for each allocation
    for (const alloc of eligibleAllocations) {
      const profile = profileMap.get(alloc.user_id);
      const walletAddress = profile?.public_wallet_address || profile?.wallet_address;

      if (!walletAddress) {
        skippedNoWallet++;
        continue;
      }

      const totalAmount = alloc.allocation_amount_capped;
      if (totalAmount <= 0) {
        skippedZeroAmount++;
        continue;
      }

      try {
        const nonce = await getNonceFromContract(walletAddress);
        const amountWei = BigInt(Math.floor(totalAmount * 1e18)).toString();
        const evidenceHash = generateEvidenceHash(['epoch_allocation'], alloc.user_id, now);

        // Get light_action IDs for this user's epoch period
        const { data: epochData } = await supabaseAdmin
          .from('mint_epochs')
          .select('epoch_month')
          .eq('id', alloc.epoch_id)
          .single();

        let actionIds: string[] = [];
        if (epochData?.epoch_month) {
          const monthStart = `${epochData.epoch_month}-01T00:00:00Z`;
          const [y, m] = epochData.epoch_month.split('-').map(Number);
          const nextMonth = m === 12 ? `${y + 1}-01-01T00:00:00Z` : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00Z`;

          const { data: actions } = await supabaseAdmin
            .from('light_actions')
            .select('id')
            .eq('user_id', alloc.user_id)
            .eq('is_eligible', true)
            .gte('created_at', monthStart)
            .lt('created_at', nextMonth)
            .limit(PAGE_SIZE);

          actionIds = (actions || []).map(a => a.id);
        }

        const { data: mintReq, error: insertError } = await supabaseAdmin
          .from('pplp_mint_requests')
          .insert({
            user_id: alloc.user_id,
            recipient_address: walletAddress,
            amount_wei: amountWei,
            amount_display: totalAmount,
            action_name: DEFAULT_ACTION_NAME,
            action_hash: actionHash,
            evidence_hash: evidenceHash,
            action_types: ['epoch_allocation'],
            nonce: Number(nonce),
            deadline: null,
            status: 'pending_sig',
            action_ids: actionIds,
          })
          .select('id')
          .single();

        if (insertError) {
          errors.push(`User ${alloc.user_id}: ${insertError.message}`);
          continue;
        }

        // Update allocation status to claimed and link mint_request_id
        await supabaseAdmin
          .from('mint_allocations')
          .update({
            status: 'claimed',
            mint_request_id: mintReq.id,
          })
          .eq('id', alloc.id);

        // Update light_actions status
        if (actionIds.length > 0) {
          const CHUNK = 500;
          for (let i = 0; i < actionIds.length; i += CHUNK) {
            await supabaseAdmin
              .from('light_actions')
              .update({ mint_status: 'pending_sig', mint_request_id: mintReq.id })
              .in('id', actionIds.slice(i, i + CHUNK));
          }
        }

        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${alloc.user_id}: ${msg}`);
      }
    }

    console.log(`[BATCH-MINT] Complete: created=${created}, skipped_no_wallet=${skippedNoWallet}, skipped_zero=${skippedZeroAmount}, errors=${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        rejected_cleaned: rejectedCount,
        created,
        skipped_no_wallet: skippedNoWallet,
        skipped_zero_amount: skippedZeroAmount,
        total_eligible_allocations: eligibleAllocations.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
      message: `Đã tạo ${created} mint requests từ ${eligibleAllocations.length} allocations. ${skippedNoWallet} users bỏ qua (chưa có ví).`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[BATCH-MINT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
