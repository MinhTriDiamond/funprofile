import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// New BASE_REWARDS: FUN = CAMLY / 1000
const NEW_BASE_REWARDS: Record<string, number> = {
  post: 5,
  comment: 1,
  reaction: 1,
  share: 1,
  friend: 10,
  livestream: 20,
  new_user_bonus: 50,
};

const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check - admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
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

    console.log(`[RECALC] Admin ${user.id} initiated recalculation`);

    // Parse optional dry_run parameter
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dry_run === true;
    } catch { /* no body = not dry run */ }

    // ===== STEP 1: Recalculate light_actions mint_amount =====
    let totalActionsUpdated = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: actions, error: fetchErr } = await supabase
        .from('light_actions')
        .select('id, action_type, base_reward, quality_score, impact_score, integrity_score, unity_multiplier, mint_amount')
        .eq('is_eligible', true)
        .range(offset, offset + BATCH_SIZE - 1)
        .order('created_at', { ascending: true });

      if (fetchErr) {
        console.error('[RECALC] Fetch error:', fetchErr);
        break;
      }

      if (!actions || actions.length === 0) {
        hasMore = false;
        break;
      }

      for (const action of actions) {
        const newBase = NEW_BASE_REWARDS[action.action_type];
        if (newBase === undefined) continue;

        const newLightScore = Math.round(
          newBase * action.quality_score * action.impact_score * action.integrity_score * action.unity_multiplier * 100
        ) / 100;
        const newMintAmount = Math.floor(newLightScore);

        if (newMintAmount !== action.mint_amount) {
          if (!dryRun) {
            await supabase
              .from('light_actions')
              .update({
                base_reward: newBase,
                light_score: newLightScore,
                mint_amount: newMintAmount,
              })
              .eq('id', action.id);
          }
          totalActionsUpdated++;
        }
      }

      offset += BATCH_SIZE;
      if (actions.length < BATCH_SIZE) hasMore = false;
      console.log(`[RECALC] Processed ${offset} actions, updated ${totalActionsUpdated}`);
    }

    // ===== STEP 2: Recalculate pplp_mint_requests =====
    let totalRequestsUpdated = 0;

    const { data: pendingRequests, error: reqErr } = await supabase
      .from('pplp_mint_requests')
      .select('id, action_ids, status')
      .in('status', ['pending_sig', 'signed']);

    if (reqErr) {
      console.error('[RECALC] Fetch requests error:', reqErr);
    } else if (pendingRequests) {
      for (const mr of pendingRequests) {
        if (!mr.action_ids || mr.action_ids.length === 0) continue;

        // Sum up recalculated mint_amounts from linked actions
        const { data: linkedActions } = await supabase
          .from('light_actions')
          .select('mint_amount')
          .in('id', mr.action_ids)
          .eq('is_eligible', true);

        if (!linkedActions) continue;

        const newTotal = linkedActions.reduce((sum: number, a: { mint_amount: number | null }) => sum + (a.mint_amount || 0), 0);
        const newAmountWei = BigInt(Math.floor(newTotal * 1e18)).toString();

        if (!dryRun) {
          await supabase
            .from('pplp_mint_requests')
            .update({
              amount_display: newTotal,
              amount_wei: newAmountWei,
            })
            .eq('id', mr.id);
        }
        totalRequestsUpdated++;
      }
    }

    const summary = {
      success: true,
      dry_run: dryRun,
      light_actions_updated: totalActionsUpdated,
      mint_requests_updated: totalRequestsUpdated,
      new_base_rewards: NEW_BASE_REWARDS,
    };

    console.log(`[RECALC] Done:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[RECALC] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
