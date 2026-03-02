import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keccak256, toHex, toBytes, pad } from "https://esm.sh/viem@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// FUN Money Contract on BSC Testnet
const FUN_MONEY_CONTRACT = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6';
const CHAIN_ID = 97; // BSC Testnet

// BSC Testnet RPC for reading nonce
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

// Default action name - must be registered in contract via govRegisterAction
const DEFAULT_ACTION_NAME = 'light_action';

// Get nonce from contract
async function getNonceFromContract(address: string): Promise<bigint> {
  try {
    // Encode function call: nonces(address)
    const functionSelector = keccak256(toBytes('nonces(address)')).slice(0, 10);
    const paddedAddress = pad(address as `0x${string}`, { size: 32 });
    const data = functionSelector + paddedAddress.slice(2);

    const response = await fetch(BSC_TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          { to: FUN_MONEY_CONTRACT, data },
          'latest',
        ],
      }),
    });

    const result = await response.json();
    if (result.error) {
      console.error('[PPLP-MINT] RPC error:', result.error);
      return 0n;
    }

    return BigInt(result.result || '0x0');
  } catch (error) {
    console.error('[PPLP-MINT] Failed to get nonce:', error);
    return 0n;
  }
}

// Generate evidence hash from action types + user + timestamp
function generateEvidenceHash(actionTypes: string[], userId: string, timestamp: number): string {
  const input = `${actionTypes.sort().join(',')}:${userId}:${timestamp}`;
  return keccak256(toBytes(input));
}

// Generate action hash - must match contract's keccak256(bytes(action))
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const body = await req.json();
    
    // === EPOCH-BASED FLOW: Accept allocation_id ===
    const { allocation_id } = body;

    if (!allocation_id) {
      return new Response(JSON.stringify({ error: 'allocation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP-MINT] Processing epoch claim for user ${userId}, allocation: ${allocation_id}`);

    // Get allocation
    const { data: allocation, error: allocErr } = await supabase
      .from('mint_allocations')
      .select('*')
      .eq('id', allocation_id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('is_eligible', true)
      .maybeSingle();

    if (allocErr || !allocation) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy allocation hợp lệ hoặc đã được claim.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalAmount = allocation.allocation_amount_capped;

    if (totalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Allocation amount is 0' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user wallet address
    const { data: profile } = await supabase
      .from('profiles')
      .select('public_wallet_address')
      .eq('id', userId)
      .single();

    const walletAddress = profile?.public_wallet_address;

    if (!walletAddress) {
      return new Response(JSON.stringify({ 
        error: 'Vui lòng cài đặt địa chỉ ví công khai trong trang cá nhân trước khi mint FUN Money.',
        error_code: 'NO_PUBLIC_WALLET'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get nonce from contract
    const nonce = await getNonceFromContract(walletAddress);
    console.log(`[PPLP-MINT] Contract nonce for ${walletAddress}: ${nonce}`);

    // Convert amount to wei (18 decimals)
    const amountWei = BigInt(Math.floor(totalAmount * 1e18)).toString();

    // Generate action_name and action_hash
    const actionName = DEFAULT_ACTION_NAME;
    const actionHash = generateActionHash(actionName);

    // Generate evidence hash from allocation
    const evidenceHash = generateEvidenceHash(['epoch_allocation'], userId, Date.now());

    console.log(`[PPLP-MINT] Creating epoch mint request:`, {
      recipient: walletAddress,
      amount: totalAmount,
      amountWei,
      allocation_id,
      nonce: nonce.toString(),
    });

    // Create mint request
    const { data: mintRequest, error: insertError } = await supabase
      .from('pplp_mint_requests')
      .insert({
        user_id: userId,
        recipient_address: walletAddress,
        amount_wei: amountWei,
        amount_display: totalAmount,
        action_name: actionName,
        action_hash: actionHash,
        evidence_hash: evidenceHash,
        action_types: ['epoch_allocation'],
        nonce: Number(nonce),
        deadline: null,
        status: 'pending_sig',
        action_ids: [],
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PPLP-MINT] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create mint request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update allocation status to claimed
    const { error: updateAllocErr } = await supabase
      .from('mint_allocations')
      .update({
        status: 'claimed',
        mint_request_id: mintRequest.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocation_id)
      .eq('user_id', userId);

    if (updateAllocErr) {
      console.error('[PPLP-MINT] Update allocation error - rolling back:', updateAllocErr);
      await supabase.from('pplp_mint_requests').delete().eq('id', mintRequest.id);
      return new Response(JSON.stringify({ 
        error: 'Không thể cập nhật allocation. Vui lòng thử lại.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP-MINT] Created epoch mint request ${mintRequest.id} for ${totalAmount} FUN to ${walletAddress}`);

    return new Response(JSON.stringify({
      success: true,
      mint_request: {
        id: mintRequest.id,
        amount: totalAmount,
        wallet: walletAddress,
        allocation_id,
        status: 'pending_sig',
        eip712_data: {
          domain: {
            name: 'FUN Money',
            version: '1.2.1',
            chainId: CHAIN_ID,
            verifyingContract: FUN_MONEY_CONTRACT,
          },
          user: walletAddress,
          actionHash,
          amount: amountWei,
          evidenceHash,
          nonce: nonce.toString(),
        },
        contract_call: {
          action_name: actionName,
          action_hash: actionHash,
        },
        message: 'Epoch mint request created. Awaiting Attester signature.',
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
