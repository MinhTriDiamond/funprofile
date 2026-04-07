import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CONTRACT_ADDRESS, BSC_TESTNET_RPCS, LOCK_WITH_PPLP_ABI } from "../_shared/pplp-eip712.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimal ethers-like RPC call using fetch
async function rpcCall(method: string, params: unknown[]) {
  for (const rpc of BSC_TESTNET_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const json = await res.json();
      if (json.result !== undefined) return json.result;
      if (json.error) throw new Error(json.error.message);
    } catch (e) {
      console.warn(`[RPC] ${rpc} failed:`, e);
      continue;
    }
  }
  throw new Error('All BSC Testnet RPCs failed');
}

// Encode function call data using ABI manually
function encodeFunctionData(
  user: string,
  action: string,
  amount: string,
  evidenceHash: string,
  sigs: string[]
): string {
  // We'll use ethers for encoding since manual ABI encoding is complex
  // Import ethers dynamically
  return ''; // placeholder - will use ethers below
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const PRIVATE_KEY = Deno.env.get('SYSTEM_HOT_WALLET_PRIVATE_KEY');
    if (!PRIVATE_KEY) {
      throw new Error('SYSTEM_HOT_WALLET_PRIVATE_KEY not configured');
    }

    // Import ethers for transaction signing
    const { ethers } = await import("npm:ethers@6");

    // Find all signed requests (3/3 signatures, no tx_hash)
    const { data: requests, error: fetchErr } = await supabase
      .from('pplp_mint_requests')
      .select('id, recipient_address, amount_wei, action_type, evidence_hash, multisig_signatures, multisig_completed_groups, nonce, user_id')
      .eq('status', 'signed')
      .is('tx_hash', null)
      .limit(20); // Batch limit per run

    if (fetchErr) throw fetchErr;
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending submissions', 
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Auto-Submit] Found ${requests.length} signed requests to submit`);

    // Connect to BSC Testnet
    let provider: InstanceType<typeof ethers.JsonRpcProvider> | null = null;
    for (const rpc of BSC_TESTNET_RPCS) {
      try {
        provider = new ethers.JsonRpcProvider(rpc, 97);
        await provider.getBlockNumber(); // Test connection
        console.log(`[Auto-Submit] Connected to ${rpc}`);
        break;
      } catch {
        console.warn(`[Auto-Submit] RPC ${rpc} failed, trying next...`);
        provider = null;
      }
    }

    if (!provider) throw new Error('All BSC Testnet RPCs failed');

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LOCK_WITH_PPLP_ABI, wallet);

    console.log(`[Auto-Submit] System wallet: ${wallet.address}`);

    // Check gas balance
    const balance = await provider.getBalance(wallet.address);
    const minGas = ethers.parseEther('0.005'); // Minimum ~0.005 tBNB
    if (balance < minGas) {
      console.error(`[Auto-Submit] Insufficient gas: ${ethers.formatEther(balance)} tBNB`);
      return new Response(JSON.stringify({
        success: false,
        error: `Insufficient gas: ${ethers.formatEther(balance)} tBNB. Need at least 0.005 tBNB.`,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ id: string; username?: string; success: boolean; txHash?: string; error?: string }> = [];

    // Process each request sequentially (nonce ordering)
    for (const req of requests) {
      try {
        // Extract signatures in order: [will, wisdom, love]
        const requiredGroups = ['will', 'wisdom', 'love'];
        const completed = req.multisig_completed_groups as string[];
        
        // Verify all 3 groups signed
        const missing = requiredGroups.filter(g => !completed.includes(g));
        if (missing.length > 0) {
          results.push({ id: req.id, success: false, error: `Missing groups: ${missing.join(', ')}` });
          continue;
        }

        const sigs = requiredGroups.map(group => {
          const sigData = (req.multisig_signatures as Record<string, { signature: string }>)?.[group];
          if (!sigData?.signature) throw new Error(`Missing signature for ${group}`);
          return sigData.signature;
        });

        // Update status to 'submitted'
        await supabase
          .from('pplp_mint_requests')
          .update({ status: 'submitted', submitted_at: new Date().toISOString() })
          .eq('id', req.id);

        console.log(`[Auto-Submit] Submitting ${req.id} for ${req.recipient_address} (${req.amount_wei} wei)`);

        // Call lockWithPPLP
        const tx = await contract.lockWithPPLP(
          req.recipient_address,
          req.action_type,
          BigInt(req.amount_wei),
          req.evidence_hash,
          sigs,
          { gasLimit: 500000 }
        );

        console.log(`[Auto-Submit] TX sent: ${tx.hash}`);

        // Update tx_hash immediately
        await supabase
          .from('pplp_mint_requests')
          .update({ tx_hash: tx.hash })
          .eq('id', req.id);

        // Wait for confirmation (2 blocks)
        const receipt = await tx.wait(2);

        if (receipt.status === 1) {
          await supabase
            .from('pplp_mint_requests')
            .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
            .eq('id', req.id);
          
          results.push({ id: req.id, success: true, txHash: tx.hash });
          console.log(`[Auto-Submit] ✅ Confirmed: ${req.id}`);
        } else {
          await supabase
            .from('pplp_mint_requests')
            .update({ status: 'failed', on_chain_error: 'CONTRACT_REVERT' })
            .eq('id', req.id);
          
          results.push({ id: req.id, success: false, error: 'Transaction reverted' });
          console.error(`[Auto-Submit] ❌ Reverted: ${req.id}`);
        }

      } catch (txErr: unknown) {
        const errMsg = txErr instanceof Error ? txErr.message : String(txErr);
        console.error(`[Auto-Submit] Error for ${req.id}:`, errMsg);

        await supabase
          .from('pplp_mint_requests')
          .update({ status: 'failed', on_chain_error: errMsg.substring(0, 500) })
          .eq('id', req.id);

        results.push({ id: req.id, success: false, error: errMsg.substring(0, 200) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[Auto-Submit] Done: ${successCount} success, ${failCount} failed out of ${results.length}`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Auto-Submit] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
