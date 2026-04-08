/**
 * PPLP Auto-Submit Edge Function
 * Tự động submit các mint requests đã đủ 3/3 chữ ký lên blockchain
 * Sử dụng ví hệ thống (hot wallet) để trả gas
 * Chạy định kỳ mỗi 30 phút qua pg_cron
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createWalletClient, createPublicClient, http, encodeFunctionData } from "npm:viem@^2.38.0";
import { privateKeyToAccount } from "npm:viem@^2.38.0/accounts";
import { bscTestnet } from "npm:viem@^2.38.0/chains";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTRACT_ADDRESS = '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6' as const;
const BATCH_SIZE = 20;
const GOV_GROUPS: readonly string[] = ['will', 'wisdom', 'love'];

const LOCK_WITH_PPLP_ABI = [
  {
    name: 'lockWithPPLP',
    type: 'function' as const,
    inputs: [
      { name: 'user', type: 'address' as const },
      { name: 'action', type: 'string' as const },
      { name: 'amount', type: 'uint256' as const },
      { name: 'evidenceHash', type: 'bytes32' as const },
      { name: 'sigs', type: 'bytes[]' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Chỉ cho phép service role hoặc cron gọi
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!authHeader || (authHeader !== `Bearer ${serviceRoleKey}` && authHeader !== `Bearer ${anonKey}`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lấy private key ví hệ thống
    const privateKey = Deno.env.get('PPLP_HOT_WALLET_PRIVATE_KEY');
    if (!privateKey) {
      return new Response(JSON.stringify({ error: 'Hot wallet not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();

    // Lấy các mint requests đã đủ 3/3 chữ ký (status = 'signed')
    const { data: signedRequests, error: fetchErr } = await supabase
      .from('pplp_mint_requests')
      .select('*')
      .eq('status', 'signed')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;

    if (!signedRequests || signedRequests.length === 0) {
      return new Response(JSON.stringify({
        success: true, processed: 0, message: 'No signed requests to submit',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[PPLP Auto-Submit] Processing ${signedRequests.length} signed requests`);

    // Tạo viem wallet client
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    });

    const walletClient = createWalletClient({
      account,
      chain: bscTestnet,
      transport: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    });

    let submitted = 0;
    let failed = 0;
    const results: Array<{ id: string; status: string; tx_hash?: string; error?: string }> = [];

    for (const req of signedRequests) {
      try {
        // Trích xuất chữ ký từ 3 nhóm GOV theo đúng thứ tự
        const sigs: string[] = [];
        const multisigSigs = req.multisig_signatures || {};

        for (const group of GOV_GROUPS) {
          const groupSig = multisigSigs[group];
          if (!groupSig?.signature) {
            throw new Error(`Missing signature for group: ${group}`);
          }
          sigs.push(groupSig.signature);
        }

        // Cập nhật status thành 'submitted' trước khi gửi TX
        await supabase
          .from('pplp_mint_requests')
          .update({ status: 'submitted', submitted_at: new Date().toISOString() })
          .eq('id', req.id);

        // Gọi lockWithPPLP trên contract
        // action_name from DB (e.g. 'light_action'), NOT action_type which doesn't exist
        const actionName = req.action_name || 'light_action';

        const txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: LOCK_WITH_PPLP_ABI,
          functionName: 'lockWithPPLP',
          args: [
            req.recipient_address as `0x${string}`,
            actionName,
            BigInt(req.amount_wei || '0'),
            req.evidence_hash as `0x${string}`,
            sigs as `0x${string}`[],
          ],
        });

        console.log(`[PPLP Auto-Submit] TX sent for request ${req.id}: ${txHash}`);

        // Chờ xác nhận TX (timeout 60s)
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 60_000,
        });

        if (receipt.status === 'success') {
          // Cập nhật thành công
          await supabase
            .from('pplp_mint_requests')
            .update({
              status: 'confirmed',
              tx_hash: txHash,
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', req.id);

          // Cập nhật light_actions liên quan
          if (req.action_ids?.length) {
            await supabase
              .from('light_actions')
              .update({
                mint_status: 'minted',
                tx_hash: txHash,
                minted_at: new Date().toISOString(),
              })
              .in('id', req.action_ids);
          }

          submitted++;
          results.push({ id: req.id, status: 'confirmed', tx_hash: txHash });
        } else {
          // TX reverted
          await supabase
            .from('pplp_mint_requests')
            .update({ status: 'failed', error_message: 'Transaction reverted' })
            .eq('id', req.id);

          failed++;
          results.push({ id: req.id, status: 'failed', error: 'Transaction reverted' });
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[PPLP Auto-Submit] Failed for ${req.id}:`, errMsg);

        // Rollback status nếu chưa gửi TX thành công
        await supabase
          .from('pplp_mint_requests')
          .update({ status: 'signed', error_message: errMsg })
          .eq('id', req.id)
          .eq('status', 'submitted'); // Chỉ rollback nếu đang ở submitted

        failed++;
        results.push({ id: req.id, status: 'failed', error: errMsg });
      }
    }

    console.log(`[PPLP Auto-Submit] Done: ${submitted} submitted, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      total: signedRequests.length,
      submitted,
      failed,
      hot_wallet: account.address,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[PPLP Auto-Submit] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
