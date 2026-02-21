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

    const { action_ids } = await req.json();

    if (!action_ids || !Array.isArray(action_ids) || action_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'action_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP-MINT] Processing mint request for user ${userId}, actions: ${action_ids.length}`);

    // Anti-duplicate check: Block if action already linked to an active mint request
    const { data: duplicateActions, error: dupError } = await supabase
      .from('light_actions')
      .select('id, mint_request_id, mint_status')
      .in('id', action_ids)
      .not('mint_request_id', 'is', null)
      .in('mint_status', ['pending_sig', 'minted', 'confirmed']);

    if (!dupError && duplicateActions && duplicateActions.length > 0) {
      console.log(`[PPLP-MINT] Duplicate detected! Actions already linked:`, duplicateActions.map(a => a.id));
      return new Response(JSON.stringify({ 
        error: 'Một số actions đã được claim trước đó. Vui lòng refresh và thử lại.',
        duplicate_action_ids: duplicateActions.map(a => a.id)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user wallet address - ONLY use public_wallet_address from Profile
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

    // Constants
    const MIN_MINT_AMOUNT = 1000;
    const MAX_DAILY_REQUESTS = 2;

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

    // Check minimum mint amount
    if (totalAmount < MIN_MINT_AMOUNT) {
      return new Response(JSON.stringify({
        error: `Cần tối thiểu ${MIN_MINT_AMOUNT} FUN để mint. Hiện tại: ${totalAmount.toFixed(0)} FUN.`,
        error_code: 'BELOW_MIN_MINT',
        current_amount: totalAmount,
        min_required: MIN_MINT_AMOUNT,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check max daily requests (excluding failed)
    const { count: todayRequestCount } = await supabase
      .from('pplp_mint_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .neq('status', 'failed');

    if ((todayRequestCount ?? 0) >= MAX_DAILY_REQUESTS) {
      return new Response(JSON.stringify({
        error: `Bạn đã tạo ${MAX_DAILY_REQUESTS} yêu cầu mint hôm nay. Giới hạn tối đa ${MAX_DAILY_REQUESTS} lần/ngày.`,
        error_code: 'DAILY_REQUEST_LIMIT',
        today_count: todayRequestCount,
        max_daily: MAX_DAILY_REQUESTS,
      }), {
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

    // Get nonce from contract
    const nonce = await getNonceFromContract(walletAddress);
    console.log(`[PPLP-MINT] Contract nonce for ${walletAddress}: ${nonce}`);

    // Convert amount to wei (18 decimals)
    const amountWei = BigInt(Math.floor(totalAmount * 1e18)).toString();

    // Generate action_name and action_hash
    // Contract will compute: h = keccak256(bytes(action)) and verify it's registered
    const actionName = DEFAULT_ACTION_NAME;
    const actionHash = generateActionHash(actionName);

    // Generate evidence hash for additional data integrity
    const actionTypes = [...new Set(actions.map(a => a.action_type))];
    const evidenceHash = generateEvidenceHash(actionTypes, userId, Date.now());

    console.log(`[PPLP-MINT] Creating mint request:`, {
      recipient: walletAddress,
      amount: totalAmount,
      amountWei,
      actionName,
      actionHash,
      evidenceHash,
      nonce: nonce.toString(),
      actionTypes,
    });

    // Create mint request in database (no deadline - contract v1.2.1 doesn't use it)
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
        action_types: actionTypes,
        nonce: Number(nonce),
        deadline: null, // Not used in contract v1.2.1
        status: 'pending_sig',
        action_ids: actions.map(a => a.id),
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

    // Update light_actions with mint_request_id
    const { error: updateActionsError } = await supabase
      .from('light_actions')
      .update({
        mint_status: 'pending_sig',
        mint_request_id: mintRequest.id,
      })
      .in('id', actions.map(a => a.id));

    if (updateActionsError) {
      console.error('[PPLP-MINT] CRITICAL: Update actions error - rolling back:', updateActionsError);
      // Rollback: delete the mint request to avoid orphan records
      await supabase.from('pplp_mint_requests').delete().eq('id', mintRequest.id);
      return new Response(JSON.stringify({ 
        error: 'Không thể khóa actions. Vui lòng thử lại.',
        details: updateActionsError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP-MINT] Created mint request ${mintRequest.id} for ${totalAmount} FUN to ${walletAddress}`);

    return new Response(JSON.stringify({
      success: true,
      mint_request: {
        id: mintRequest.id,
        amount: totalAmount,
        wallet: walletAddress,
        actions_count: actions.length,
        status: 'pending_sig',
        // EIP-712 data for frontend display (matches contract PureLoveProof struct)
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
        // Contract call data
        contract_call: {
          action_name: actionName,
          action_hash: actionHash,
        },
        message: 'Mint request created. Awaiting Attester signature in Admin Panel.',
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
