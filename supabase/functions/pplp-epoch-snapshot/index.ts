import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// LS-Math-v1.0 config
const ANTI_WHALE_CAP = 0.03; // 3%
const MIN_LIGHT_THRESHOLD = 10;
const DEFAULT_MINT_POOL = 5000000; // 5M FUN

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: require admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const epochMonth = body.epoch_month || new Date().toISOString().slice(0, 7);
    const mintPool = body.mint_pool || DEFAULT_MINT_POOL;

    console.log(`[EPOCH-SNAPSHOT] Starting snapshot for ${epochMonth}, pool=${mintPool}`);

    // Calculate month date range
    const [year, month] = epochMonth.split('-').map(Number);
    const startDate = `${epochMonth}-01T00:00:00Z`;
    const endDate = new Date(year, month, 1).toISOString();

    // ===== 1. Aggregate v1 Light Score per user =====
    const v1Scores = new Map<string, number>();
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('light_actions')
        .select('user_id, light_score')
        .eq('is_eligible', true)
        .eq('mint_status', 'approved')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        v1Scores.set(row.user_id, (v1Scores.get(row.user_id) || 0) + (row.light_score || 0));
      }

      if (data.length < pageSize) break;
      page++;
    }

    // ===== 2. Aggregate v2 Light Score per user =====
    const v2Scores = new Map<string, number>();
    page = 0;

    while (true) {
      const { data, error } = await supabase
        .from('pplp_v2_validations')
        .select('action_id, final_light_score, created_at, pplp_v2_user_actions!inner(user_id)')
        .eq('validation_status', 'validated')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.warn('[EPOCH-SNAPSHOT] v2 query error (may not have data yet):', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      for (const row of data) {
        const userId = (row as any).pplp_v2_user_actions?.user_id;
        if (userId) {
          v2Scores.set(userId, (v2Scores.get(userId) || 0) + (row.final_light_score || 0));
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    // ===== 3. Merge v1 + v2 scores =====
    const allUserIds = new Set([...v1Scores.keys(), ...v2Scores.keys()]);
    let allScores = Array.from(allUserIds).map(uid => ({
      user_id: uid,
      total_light: (v1Scores.get(uid) || 0) + (v2Scores.get(uid) || 0),
      v1_contribution: v1Scores.get(uid) || 0,
      v2_contribution: v2Scores.get(uid) || 0,
    }));

    console.log(`[EPOCH-SNAPSHOT] Found ${allScores.length} users (v1: ${v1Scores.size}, v2: ${v2Scores.size})`);

    // ===== 4. Filter out banned/fraud users =====
    let bannedScores: typeof allScores = [];
    if (allScores.length > 0) {
      const userIds = allScores.map(s => s.user_id);
      const bannedUserIds = new Set<string>();

      for (let i = 0; i < userIds.length; i += 500) {
        const batch = userIds.slice(i, i + 500);
        const { data: bannedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('id', batch)
          .eq('is_banned', true);

        if (bannedProfiles) {
          for (const bp of bannedProfiles) {
            bannedUserIds.add(bp.id);
          }
        }
      }

      if (bannedUserIds.size > 0) {
        console.log(`[EPOCH-SNAPSHOT] Filtering out ${bannedUserIds.size} banned users`);
        bannedScores = allScores.filter(s => bannedUserIds.has(s.user_id));
        allScores = allScores.filter(s => !bannedUserIds.has(s.user_id));
      }
    }

    // 5. Filter eligible users
    const eligibleUsers = allScores.filter(u => u.total_light >= MIN_LIGHT_THRESHOLD);
    const ineligibleUsers = allScores.filter(u => u.total_light < MIN_LIGHT_THRESHOLD);

    const totalLight = eligibleUsers.reduce((sum, u) => sum + u.total_light, 0);

    if (totalLight === 0 || eligibleUsers.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No eligible users for this epoch',
        stats: { total_users: allScores.length, eligible: 0, total_light: 0 },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 6. Calculate allocations with anti-whale cap
    let allocations = eligibleUsers.map(u => {
      const share = u.total_light / totalLight;
      const rawAmount = share * mintPool;
      const reasonCodes = ['EPOCH_ELIGIBLE'] as string[];
      if (u.v2_contribution > 0) reasonCodes.push('V2_PARTICIPANT');
      return {
        user_id: u.user_id,
        light_score_total: u.total_light,
        share_percent: share * 100,
        allocation_amount: rawAmount,
        allocation_amount_capped: rawAmount,
        is_eligible: true,
        reason_codes: reasonCodes,
      };
    });

    // Apply anti-whale cap iteratively
    const maxPerUser = mintPool * ANTI_WHALE_CAP;
    let iterations = 0;

    while (iterations < 10) {
      let surplus = 0;
      
      for (const alloc of allocations) {
        if (alloc.allocation_amount_capped > maxPerUser) {
          surplus += alloc.allocation_amount_capped - maxPerUser;
          alloc.allocation_amount_capped = maxPerUser;
          if (!alloc.reason_codes.includes('ANTI_WHALE_CAPPED')) {
            alloc.reason_codes.push('ANTI_WHALE_CAPPED');
          }
        }
      }

      if (surplus === 0) break;

      const uncapped = allocations.filter(a => a.allocation_amount_capped < maxPerUser);
      if (uncapped.length === 0) break;

      const redistributeEach = surplus / uncapped.length;
      for (const alloc of uncapped) {
        alloc.allocation_amount_capped = Math.min(maxPerUser, alloc.allocation_amount_capped + redistributeEach);
      }

      iterations++;
    }

    // 7. Create or get epoch record
    let epochId: string;

    const { data: existingEpoch } = await supabase
      .from('mint_epochs')
      .select('id, status')
      .eq('epoch_month', epochMonth)
      .maybeSingle();

    if (existingEpoch) {
      if (existingEpoch.status === 'finalized') {
        return new Response(JSON.stringify({ error: 'Epoch already finalized' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      epochId = existingEpoch.id;

      await supabase.from('mint_allocations').delete().eq('epoch_id', epochId);

      await supabase.from('mint_epochs').update({
        mint_pool: mintPool,
        total_light_score: totalLight,
        eligible_users: eligibleUsers.length,
        status: 'snapshot',
        rules_version: 'LS-Math-v1.0+v2',
        snapshot_at: new Date().toISOString(),
        total_minted: 0,
        total_actions: allScores.length,
        unique_users: allScores.length,
        updated_at: new Date().toISOString(),
      }).eq('id', epochId);
    } else {
      const { data: newEpoch, error: epochErr } = await supabase
        .from('mint_epochs')
        .insert({
          epoch_date: `${epochMonth}-01`,
          epoch_month: epochMonth,
          mint_pool: mintPool,
          total_light_score: totalLight,
          eligible_users: eligibleUsers.length,
          status: 'snapshot',
          rules_version: 'LS-Math-v1.0+v2',
          snapshot_at: new Date().toISOString(),
          total_minted: 0,
          total_actions: allScores.length,
          unique_users: allScores.length,
          total_cap: mintPool,
        })
        .select('id')
        .single();

      if (epochErr) throw epochErr;
      epochId = newEpoch.id;
    }

    // 8. Insert allocations
    const allocRows = allocations.map(a => ({
      epoch_id: epochId,
      user_id: a.user_id,
      light_score_total: Math.round(a.light_score_total * 100) / 100,
      share_percent: Math.round(a.share_percent * 10000) / 10000,
      allocation_amount: Math.round(a.allocation_amount * 100) / 100,
      allocation_amount_capped: Math.floor(a.allocation_amount_capped),
      is_eligible: true,
      reason_codes: a.reason_codes,
      status: 'pending',
    }));

    const ineligibleRows = ineligibleUsers.map(u => ({
      epoch_id: epochId,
      user_id: u.user_id,
      light_score_total: Math.round(u.total_light * 100) / 100,
      share_percent: 0,
      allocation_amount: 0,
      allocation_amount_capped: 0,
      is_eligible: false,
      reason_codes: ['BELOW_MIN_LIGHT_THRESHOLD'],
      status: 'pending',
    }));

    const bannedRows = bannedScores.map(u => ({
      epoch_id: epochId,
      user_id: u.user_id,
      light_score_total: Math.round(u.total_light * 100) / 100,
      share_percent: 0,
      allocation_amount: 0,
      allocation_amount_capped: 0,
      is_eligible: false,
      reason_codes: ['FRAUD_BANNED'],
      status: 'pending',
    }));

    const allRows = [...allocRows, ...ineligibleRows, ...bannedRows];
    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500);
      const { error: insertErr } = await supabase.from('mint_allocations').insert(batch);
      if (insertErr) {
        console.error(`[EPOCH-SNAPSHOT] Insert batch error:`, insertErr);
        throw insertErr;
      }
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.allocation_amount_capped, 0);
    const cappedUsers = allocations.filter(a => a.reason_codes.includes('ANTI_WHALE_CAPPED')).length;
    const v2Participants = allocations.filter(a => a.reason_codes.includes('V2_PARTICIPANT')).length;

    console.log(`[EPOCH-SNAPSHOT] Complete: ${eligibleUsers.length} eligible (${v2Participants} v2), ${totalAllocated} FUN allocated, ${cappedUsers} capped`);

    return new Response(JSON.stringify({
      success: true,
      epoch_id: epochId,
      epoch_month: epochMonth,
      stats: {
        total_users: allScores.length,
        eligible_users: eligibleUsers.length,
        ineligible_users: ineligibleUsers.length,
        v2_participants: v2Participants,
        total_light_score: Math.round(totalLight * 100) / 100,
        mint_pool: mintPool,
        total_allocated: Math.round(totalAllocated),
        anti_whale_capped: cappedUsers,
        cap_percentage: ANTI_WHALE_CAP * 100,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[EPOCH-SNAPSHOT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
