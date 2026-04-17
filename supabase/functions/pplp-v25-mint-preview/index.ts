// PPLP v2.5 — Mint Preview
// Mint = ΔLS_window × mint_base_rate × TC^tc_weight × SI^stability_weight
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const user_id: string | undefined = body.user_id;
    if (!user_id) {
      // Try get from JWT
      const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
      if (!auth) {
        return new Response(JSON.stringify({ error: 'user_id or auth required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: user } = await supabase.auth.getUser(auth);
      if (!user.user) {
        return new Response(JSON.stringify({ error: 'invalid auth' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body.user_id = user.user.id;
    }
    const uid = body.user_id;

    // 1. Active phase + mint linking
    const { data: phase } = await supabase
      .from('pplp_v25_phase_config')
      .select('phase_name, alpha, beta, gamma')
      .eq('is_active', true)
      .maybeSingle();
    const phaseName = phase?.phase_name ?? 'early';

    const { data: linking } = await supabase
      .from('pplp_v25_mint_linking_config')
      .select('*')
      .eq('phase_name', phaseName)
      .maybeSingle();

    const mint_base_rate = Number(linking?.mint_base_rate ?? 1.0);
    const tc_weight = Number(linking?.tc_weight ?? 1.0);
    const stability_weight = Number(linking?.stability_weight ?? 1.0);
    const window_days = Number(linking?.delta_ls_window_days ?? 7);
    const min_tc = Number(linking?.min_tc_to_mint ?? 0.8);
    const max_mint = Number(linking?.max_mint_per_epoch_per_user ?? 1000);

    // 2. ΔLS over window
    const sinceISO = new Date(Date.now() - window_days * 86400_000).toISOString();
    const { data: scores } = await supabase
      .from('pplp_v25_light_scores')
      .select('raw_ls, created_at')
      .eq('user_id', uid)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true });

    let delta_ls = 0;
    if (scores && scores.length >= 2) {
      delta_ls = Math.max(0, Number(scores[scores.length - 1].raw_ls) - Number(scores[0].raw_ls));
    } else if (scores && scores.length === 1) {
      delta_ls = Number(scores[0].raw_ls);
    }

    // 3. TC từ profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('trust_level')
      .eq('id', uid)
      .maybeSingle();
    const tc = Math.max(0.5, Math.min(1.5, Number(profile?.trust_level ?? 1.0)));

    // 4. SI mới nhất
    const { data: si } = await supabase
      .from('pplp_v25_stability_index')
      .select('stability_index')
      .eq('user_id', uid)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    const stability_index = Number(si?.stability_index ?? 1.0);

    // 5. Mint formula
    const eligible = tc >= min_tc;
    const raw_mint = delta_ls * mint_base_rate * Math.pow(tc, tc_weight) * Math.pow(stability_index, stability_weight);
    const mint_estimate = eligible ? Math.min(max_mint, Math.max(0, raw_mint)) : 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        phase: phaseName,
        delta_ls, window_days,
        tc, stability_index,
        mint_base_rate, tc_weight, stability_weight,
        min_tc_to_mint: min_tc, max_mint_per_epoch_per_user: max_mint,
        eligible, raw_mint, mint_estimate,
        formula: 'ΔLS × base_rate × TC^tc_w × SI^sta_w',
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
