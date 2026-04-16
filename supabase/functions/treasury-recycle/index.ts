/**
 * Treasury Recycle — Route platform fees vào treasury vaults theo policy
 * Có thể gọi từ admin hoặc các edge function khác (record-donation, etc.)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!authHeader || (authHeader !== `Bearer ${serviceKey}` && authHeader !== `Bearer ${anonKey}`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey!);
    const body = await req.json().catch(() => ({}));
    const { source, amount, reason, reference_table, reference_id } = body;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'amount required > 0' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default split khi recycle: theo allocation_pct của vaults
    const { data: vaults } = await supabase
      .from('treasury_vaults').select('vault_key, balance, total_inflow, allocation_pct').eq('is_active', true);
    if (!vaults || vaults.length === 0) throw new Error('No active vaults');

    const flows: Array<{ vault: string; amount: number }> = [];
    for (const v of vaults) {
      const portion = Math.floor(amount * Number(v.allocation_pct));
      if (portion > 0) {
        flows.push({ vault: v.vault_key, amount: portion });
        await supabase.from('treasury_flows').insert({
          flow_type: 'recycle',
          source: source || 'unknown',
          destination_vault: v.vault_key,
          amount: portion,
          reason: reason || 'Platform fee recycle',
          reference_table,
          reference_id,
        });
        await supabase.from('treasury_vaults').update({
          balance: Number(v.balance) + portion,
          total_inflow: Number(v.total_inflow) + portion,
        }).eq('vault_key', v.vault_key);
      }
    }

    return new Response(JSON.stringify({ success: true, total_recycled: amount, flows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[TREASURY-RECYCLE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
