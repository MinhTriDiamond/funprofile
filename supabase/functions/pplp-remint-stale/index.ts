import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keccak256, toBytes, pad } from "https://esm.sh/viem@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUN_MONEY_CONTRACT = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const DEFAULT_ACTION_NAME = 'FUN_REWARD';

async function getNonceFromContract(address: string): Promise<bigint> {
  try {
    const functionSelector = keccak256(toBytes('nonces(address)')).slice(0, 10);
    const paddedAddress = pad(address as `0x${string}`, { size: 32 });
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

function toWei(amount: number): string {
  const amountStr = String(amount);
  const [intPart, decPart = ''] = amountStr.split('.');
  const paddedDec = (decPart + '000000000000000000').slice(0, 18);
  return BigInt(intPart + paddedDec).toString();
}

function generateActionHash(actionName: string): string {
  return keccak256(toBytes(actionName));
}

function generateEvidenceHash(actionTypes: string[], userId: string, timestamp: number): string {
  const input = `${actionTypes.sort().join(',')}:${userId}:${timestamp}`;
  return keccak256(toBytes(input));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check - must be admin
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

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all signed requests (stale)
    const { data: staleRequests, error: fetchErr } = await supabase
      .from('pplp_mint_requests')
      .select('id, user_id, recipient_address, amount_display, action_types, nonce')
      .eq('status', 'signed')
      .order('created_at');

    if (fetchErr || !staleRequests || staleRequests.length === 0) {
      return new Response(JSON.stringify({ error: 'No signed requests found', details: fetchErr }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[REMINT] Processing ${staleRequests.length} stale signed requests`);

    const results: Array<{
      old_id: string;
      user_id: string;
      wallet: string;
      amount: number;
      old_nonce: number;
      new_nonce: string;
      new_request_id?: string;
      allocation_id?: string;
      status: string;
      error?: string;
    }> = [];

    for (const req of staleRequests) {
      const entry: typeof results[0] = {
        old_id: req.id,
        user_id: req.user_id,
        wallet: req.recipient_address,
        amount: req.amount_display,
        old_nonce: req.nonce,
        new_nonce: '',
        status: 'processing',
      };

      try {
        // 1. Mark old request as failed
        await supabase
          .from('pplp_mint_requests')
          .update({ status: 'failed', error_message: 'Stale nonce - replaced by remint' })
          .eq('id', req.id);

        // 2. Find and reset the allocation linked to this request
        const { data: allocation } = await supabase
          .from('mint_allocations')
          .select('id')
          .eq('mint_request_id', req.id)
          .maybeSingle();

        if (allocation) {
          await supabase
            .from('mint_allocations')
            .update({ status: 'pending', mint_request_id: null, updated_at: new Date().toISOString() })
            .eq('id', allocation.id);
          entry.allocation_id = allocation.id;
        }

        // 3. Get fresh nonce from chain
        const freshNonce = await getNonceFromContract(req.recipient_address);
        entry.new_nonce = freshNonce.toString();

        // 4. Compute correct amount_wei using BigInt
        const amountWei = toWei(req.amount_display);

        // 5. Generate hashes
        const actionHash = generateActionHash(DEFAULT_ACTION_NAME);
        const actionTypes = req.action_types || ['epoch_allocation'];
        const evidenceHash = generateEvidenceHash(actionTypes, req.user_id, Date.now());

        // 6. Create new mint request
        const { data: newReq, error: insertErr } = await supabase
          .from('pplp_mint_requests')
          .insert({
            user_id: req.user_id,
            recipient_address: req.recipient_address,
            amount_wei: amountWei,
            amount_display: req.amount_display,
            action_name: DEFAULT_ACTION_NAME,
            action_hash: actionHash,
            evidence_hash: evidenceHash,
            action_types: actionTypes,
            nonce: Number(freshNonce),
            deadline: null,
            status: 'pending_sig',
            action_ids: [],
            retry_count: 0,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        // 7. Link allocation to new request
        if (allocation) {
          await supabase
            .from('mint_allocations')
            .update({
              status: 'claimed',
              mint_request_id: newReq.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', allocation.id);
        }

        entry.new_request_id = newReq.id;
        entry.status = 'success';
      } catch (err) {
        entry.status = 'error';
        entry.error = err instanceof Error ? err.message : String(err);
      }

      results.push(entry);
    }

    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log(`[REMINT] Done: ${success} success, ${failed} failed`);

    return new Response(JSON.stringify({
      summary: { total: results.length, success, failed },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[REMINT] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
