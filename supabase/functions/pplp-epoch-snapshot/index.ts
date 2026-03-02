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
    const epochMonth = body.epoch_month || new Date().toISOString().slice(0, 7); // '2026-03'
    const mintPool = body.mint_pool || DEFAULT_MINT_POOL;

    console.log(`[EPOCH-SNAPSHOT] Starting snapshot for ${epochMonth}, pool=${mintPool}`);

    // Calculate month date range
    const [year, month] = epochMonth.split('-').map(Number);
    const startDate = `${epochMonth}-01T00:00:00Z`;
    const endDate = new Date(year, month, 1).toISOString(); // First day of next month

    // 1. Aggregate Light Score per user for the month
    // Fetch in pages to handle >1000 rows
    let allScores: { user_id: string; total_light: number }[] = [];
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
        const existing = allScores.find(s => s.user_id === row.user_id);
        if (existing) {
          existing.total_light += row.light_score || 0;
        } else {
          allScores.push({ user_id: row.user_id, total_light: row.light_score || 0 });
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    console.log(`[EPOCH-SNAPSHOT] Found ${allScores.length} users with actions`);

    // 1.5. Filter out banned/fraud users
    if (allScores.length > 0) {
      const userIds = allScores.map(s => s.user_id);
      const bannedUserIds = new Set<string>();

      // Query in batches of 500 to handle large sets
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
        // Move banned users to a separate list for ineligible tracking
        var bannedScores = allScores.filter(s => bannedUserIds.has(s.user_id));
        allScores = allScores.filter(s => !bannedUserIds.has(s.user_id));
      }
    }

    // 2. Filter eligible users (light >= threshold)
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

    // 3. Calculate allocations with anti-whale cap
    let allocations = eligibleUsers.map(u => {
      const share = u.total_light / totalLight;
      const rawAmount = share * mintPool;
      return {
        user_id: u.user_id,
        light_score_total: u.total_light,
        share_percent: share * 100,
        allocation_amount: rawAmount,
        allocation_amount_capped: rawAmount,
        is_eligible: true,
        reason_codes: ['EPOCH_ELIGIBLE'] as string[],
      };
    });

    // Apply anti-whale cap iteratively
    const maxPerUser = mintPool * ANTI_WHALE_CAP;
    let surplus = 0;
    let uncappedUsers = allocations.length;
    let iterations = 0;

    while (iterations < 10) {
      surplus = 0;
      let cappedCount = 0;
      
      for (const alloc of allocations) {
        if (alloc.allocation_amount_capped > maxPerUser) {
          surplus += alloc.allocation_amount_capped - maxPerUser;
          alloc.allocation_amount_capped = maxPerUser;
          alloc.reason_codes.push('ANTI_WHALE_CAPPED');
          cappedCount++;
        }
      }

      if (surplus === 0) break;

      // Redistribute surplus to uncapped users
      const uncapped = allocations.filter(a => a.allocation_amount_capped < maxPerUser);
      if (uncapped.length === 0) break;

      const redistributeEach = surplus / uncapped.length;
      for (const alloc of uncapped) {
        alloc.allocation_amount_capped = Math.min(maxPerUser, alloc.allocation_amount_capped + redistributeEach);
      }

      iterations++;
    }

    // 4. Create or get epoch record
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

      // Delete old allocations if re-running snapshot
      await supabase.from('mint_allocations').delete().eq('epoch_id', epochId);

      // Update epoch
      await supabase.from('mint_epochs').update({
        mint_pool: mintPool,
        total_light_score: totalLight,
        eligible_users: eligibleUsers.length,
        status: 'snapshot',
        rules_version: 'LS-Math-v1.0',
        snapshot_at: new Date().toISOString(),
        total_minted: 0,
        total_actions: allScores.reduce((s, u) => s + 1, 0),
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
          rules_version: 'LS-Math-v1.0',
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

    // 5. Insert allocations
    const allocRows = allocations.map(a => ({
      epoch_id: epochId,
      user_id: a.user_id,
      light_score_total: Math.round(a.light_score_total * 100) / 100,
      share_percent: Math.round(a.share_percent * 10000) / 10000,
      allocation_amount: Math.round(a.allocation_amount * 100) / 100,
      allocation_amount_capped: Math.floor(a.allocation_amount_capped), // Integer FUN
      is_eligible: true,
      reason_codes: a.reason_codes,
      status: 'pending',
    }));

    // Also insert ineligible users for transparency
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

    // Also insert banned users as ineligible
    const bannedRows = (typeof bannedScores !== 'undefined' ? bannedScores : []).map(u => ({
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

    // Insert in batches
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

    console.log(`[EPOCH-SNAPSHOT] Complete: ${eligibleUsers.length} eligible, ${totalAllocated} FUN allocated, ${cappedUsers} capped`);

    return new Response(JSON.stringify({
      success: true,
      epoch_id: epochId,
      epoch_month: epochMonth,
      stats: {
        total_users: allScores.length,
        eligible_users: eligibleUsers.length,
        ineligible_users: ineligibleUsers.length,
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
