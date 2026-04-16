// PPLP v2.5 — VVU Calculator
// Tính Verified Value Unit cho mỗi action: VVU = B × Q × TC × IIS × IM × AAF × ERP
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalcInput {
  source_table: 'light_actions' | 'pplp_v2_user_actions';
  source_id: string;
  vvu_type?: 'personal' | 'network' | 'legacy';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const inputs: CalcInput[] = Array.isArray(body) ? body : [body];

    const results: any[] = [];

    for (const input of inputs) {
      const { source_table, source_id, vvu_type = 'personal' } = input;

      // 1. Fetch action
      let action: any = null;
      let user_id: string | null = null;
      let base_value = 0;
      let quality_score = 1.0;

      if (source_table === 'light_actions') {
        const { data } = await supabase
          .from('light_actions')
          .select('user_id, base_reward, light_score, quality_score, integrity_score, impact_score, unity_score, is_eligible')
          .eq('id', source_id)
          .maybeSingle();
        if (!data || !data.is_eligible) continue;
        action = data;
        user_id = data.user_id;
        base_value = Number(data.base_reward ?? data.light_score ?? 0);
        quality_score = Math.min(1.5, (Number(data.quality_score ?? 1) +
          Number(data.integrity_score ?? 1) +
          Number(data.impact_score ?? 1) +
          Number(data.unity_score ?? 1)) / 4);
      } else if (source_table === 'pplp_v2_user_actions') {
        const { data } = await supabase
          .from('pplp_v2_user_actions')
          .select('user_id, light_score, status, base_reward')
          .eq('id', source_id)
          .maybeSingle();
        if (!data || data.status !== 'validated') continue;
        action = data;
        user_id = data.user_id;
        base_value = Number(data.base_reward ?? data.light_score ?? 0);
        quality_score = 1.0;
      }

      if (!user_id) continue;

      // 2. Trust Context (TC) từ profile.trust_level
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level')
        .eq('id', user_id)
        .maybeSingle();
      const trust_context = Math.max(0.5, Math.min(2.0, Number(profile?.trust_level ?? 1.0)));

      // 3. IIS từ intent_metrics
      const { data: intent } = await supabase
        .from('pplp_v25_intent_metrics')
        .select('iis_value')
        .eq('user_id', user_id)
        .maybeSingle();
      const iis_value = Number(intent?.iis_value ?? 1.0);

      // 4. IM từ impact_metrics (mới nhất cho action này, fallback 1.0)
      const { data: impact } = await supabase
        .from('pplp_v25_impact_metrics')
        .select('im_value')
        .eq('user_id', user_id)
        .eq('source_id', source_id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const im_value = Number(impact?.im_value ?? 1.0);

      // 5. Anti-Abuse Factor — từ pplp_v2_engagements.fraud_score nếu có
      let anti_abuse_factor = 1.0;
      const { data: eng } = await supabase
        .from('pplp_v2_engagements')
        .select('fraud_score')
        .eq('action_id', source_id)
        .limit(1)
        .maybeSingle();
      if (eng?.fraud_score != null) {
        anti_abuse_factor = Math.max(0, 1 - Number(eng.fraud_score));
      }

      // 6. ERP factor — placeholder, default 1.0
      const erp_factor = 1.0;

      // 7. VVU
      const vvu_value = base_value * quality_score * trust_context * iis_value * im_value * anti_abuse_factor * erp_factor;

      // 8. Upsert
      const { data: logged, error } = await supabase
        .from('pplp_v25_vvu_log')
        .upsert({
          user_id,
          source_table,
          source_id,
          vvu_type,
          base_value,
          quality_score,
          trust_context,
          iis_value,
          im_value,
          anti_abuse_factor,
          erp_factor,
          vvu_value,
          computed_at: new Date().toISOString(),
        }, { onConflict: 'source_table,source_id,vvu_type' })
        .select()
        .single();

      if (error) {
        results.push({ source_id, error: error.message });
      } else {
        results.push({ source_id, vvu_value, log_id: logged.id });
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
