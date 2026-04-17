/**
 * PPLP Epoch Snapshot v2 — FUN Monetary Expansion v1
 * 
 * Công thức:
 *   TotalMint = BaseExpansion + ContributionExpansion + EcosystemExpansion
 *   AdjustedMint = TotalMint × DisciplineModulator
 *   FinalMint = clamp(MinMint, AdjustedMint, SoftCeiling)
 * 
 * Allocation: User 70% / Ecosystem 12% / Treasury 10% / Strategic 5% / Resilience 3%
 * UserSplit: 15% instant + 85% locked (vesting 28 ngày)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_LIGHT_THRESHOLD = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth: chấp nhận (a) service-role key, (b) cron-shared-secret, HOẶC (c) admin JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const CRON_SECRET = Deno.env.get('CRON_SHARED_SECRET') ?? '';
    const cronHeader = req.headers.get('x-cron-secret') ?? '';

    const isService = token && token === SERVICE_KEY;
    const isCron = CRON_SECRET && cronHeader === CRON_SECRET;

    if (!isService && !isCron) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roleData } = await supabase
        .from('user_roles').select('role')
        .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log(`[EPOCH-SNAPSHOT] ${isService ? 'service-role' : 'cron-secret'} invocation`);
    }

    const body = await req.json().catch(() => ({}));
    const epochMonth = body.epoch_month || new Date().toISOString().slice(0, 7);

    // === Load epoch_config ===
    const { data: cfg } = await supabase
      .from('epoch_config').select('*')
      .eq('config_key', 'default').eq('is_active', true).single();
    if (!cfg) throw new Error('No active epoch_config found');

    const SOFT_CEILING = Number(cfg.soft_ceiling) || 5_000_000;
    const MIN_MINT = Number(cfg.min_epoch_mint) || 100_000;
    console.log(`[EPOCH-SNAPSHOT v2] Stage=${cfg.system_stage}, ceiling=${SOFT_CEILING}, month=${epochMonth}`);

    const [year, month] = epochMonth.split('-').map(Number);
    const startDate = `${epochMonth}-01T00:00:00Z`;
    const endDate = new Date(year, month, 1).toISOString();

    // === Aggregate v1 + v2 light scores ===
    const v1Scores = new Map<string, number>();
    const v2Scores = new Map<string, number>();
    const pageSize = 1000;

    // v1 light_actions
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('light_actions').select('user_id, light_score')
        .eq('is_eligible', true).eq('mint_status', 'approved')
        .gte('created_at', startDate).lt('created_at', endDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) v1Scores.set(r.user_id, (v1Scores.get(r.user_id) || 0) + (r.light_score || 0));
      if (data.length < pageSize) break;
      page++;
    }

    // v2 validations
    page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('pplp_v2_validations')
        .select('final_light_score, created_at, pplp_v2_user_actions!inner(user_id)')
        .eq('validation_status', 'validated')
        .gte('created_at', startDate).lt('created_at', endDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) { console.warn('v2 query error:', error.message); break; }
      if (!data || data.length === 0) break;
      for (const r of data) {
        const uid = (r as any).pplp_v2_user_actions?.user_id;
        if (uid) v2Scores.set(uid, (v2Scores.get(uid) || 0) + (r.final_light_score || 0));
      }
      if (data.length < pageSize) break;
      page++;
    }

    const allUserIds = new Set([...v1Scores.keys(), ...v2Scores.keys()]);
    let allScores = Array.from(allUserIds).map(uid => ({
      user_id: uid,
      total_light: (v1Scores.get(uid) || 0) + (v2Scores.get(uid) || 0),
      v1: v1Scores.get(uid) || 0,
      v2: v2Scores.get(uid) || 0,
    }));

    // Filter banned users
    let bannedScores: typeof allScores = [];
    if (allScores.length > 0) {
      const ids = allScores.map(s => s.user_id);
      const banned = new Set<string>();
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        const { data } = await supabase.from('profiles').select('id').in('id', batch).eq('is_banned', true);
        if (data) for (const b of data) banned.add(b.id);
      }
      if (banned.size > 0) {
        bannedScores = allScores.filter(s => banned.has(s.user_id));
        allScores = allScores.filter(s => !banned.has(s.user_id));
      }
    }

    const eligibleUsers = allScores.filter(u => u.total_light >= MIN_LIGHT_THRESHOLD);
    const ineligibleUsers = allScores.filter(u => u.total_light < MIN_LIGHT_THRESHOLD);
    const totalLight = eligibleUsers.reduce((s, u) => s + u.total_light, 0);

    // === Monetary Formula v1 ===
    // 1. BaseExpansion = base_rate × stage_factor (Stage 1 = 1.0, Stage 2 = 0.7, Stage 3 = 0.5)
    const stageFactor = cfg.system_stage === 'mature' ? 0.5 : cfg.system_stage === 'growth' ? 0.7 : 1.0;
    const baseExpansion = Number(cfg.base_rate) * stageFactor;

    // 2. ContributionExpansion = α·log(1+VLS) + β·sqrt(1+VCV) + γ·ServiceImpact
    const verifiedLightScore = totalLight;
    const verifiedContributionValue = totalLight * 1.2; // proxy
    const serviceImpactScore = eligibleUsers.length * 50; // proxy: 50 pts per active user
    const contributionExpansion =
      Number(cfg.alpha) * Math.log(1 + verifiedLightScore) +
      Number(cfg.beta) * Math.sqrt(1 + verifiedContributionValue) +
      Number(cfg.gamma) * Math.log(1 + serviceImpactScore);

    // 3. EcosystemExpansion = δ·UsageIndex + ε·ActiveQualityUsers + ζ·UtilityDiversity
    const ecosystemUsageIndex = Math.log(1 + eligibleUsers.length * 10);
    const activeQualityUsers = eligibleUsers.length;
    const utilityDiversityIndex = Math.min(6, eligibleUsers.length / 50); // platforms in use
    const ecosystemExpansion =
      Number(cfg.delta) * ecosystemUsageIndex +
      Number(cfg.epsilon) * Math.sqrt(activeQualityUsers) +
      Number(cfg.zeta) * utilityDiversityIndex;

    const totalMint = baseExpansion + contributionExpansion + ecosystemExpansion;

    // 4. DisciplineModulator (1.0 default; can be tuned by previous epoch health)
    const { data: lastHealth } = await supabase
      .from('inflation_health_metrics').select('*')
      .order('measured_at', { ascending: false }).limit(1).maybeSingle();
    let modulator = 1.0;
    if (lastHealth) {
      const fraud = Number(lastHealth.fraud_pressure_ratio) || 0;
      const utility = Number(lastHealth.utility_absorption_ratio) || 1;
      modulator = Math.max(
        Number(cfg.modulator_min),
        Math.min(Number(cfg.modulator_max), 1.0 - fraud * 0.5 + (utility - 1) * 0.2)
      );
    }
    const adjustedMint = totalMint * modulator;
    const finalMint = Math.max(MIN_MINT, Math.min(SOFT_CEILING, adjustedMint));

    console.log(`[MONETARY] base=${baseExpansion.toFixed(0)} contrib=${contributionExpansion.toFixed(0)} eco=${ecosystemExpansion.toFixed(0)} mod=${modulator.toFixed(3)} final=${finalMint.toFixed(0)}`);

    if (totalLight === 0 || eligibleUsers.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: 'No eligible users',
        stats: { total_users: allScores.length, eligible: 0 },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === 5-bucket Allocation ===
    const userPool = finalMint * Number(cfg.user_pool_pct);
    const ecosystemPool = finalMint * Number(cfg.ecosystem_pool_pct);
    const treasuryPool = finalMint * Number(cfg.treasury_pool_pct);
    const strategicPool = finalMint * Number(cfg.strategic_pool_pct);
    const resiliencePool = finalMint * Number(cfg.resilience_pool_pct);

    // === User allocations: PPLP v2.5 — RawLS × TierMultiplier × Consistency ===
    // Phương án A: thay total_light_score bằng raw_light_score v2.5
    // Fallback về total_light cũ nếu user chưa có v2.5 data
    const eligibleIds = eligibleUsers.map(u => u.user_id);
    const v25Map = new Map<string, { raw_ls: number; consistency: number; tier_mult: number }>();

    if (eligibleIds.length > 0) {
      // Pull v2.5 light scores
      for (let i = 0; i < eligibleIds.length; i += 500) {
        const batch = eligibleIds.slice(i, i + 500);
        const { data: lsData } = await supabase
          .from('pplp_v25_light_scores')
          .select('user_id, raw_ls, consistency_multiplier')
          .in('user_id', batch)
          .eq('is_current', true);
        for (const r of lsData ?? []) {
          v25Map.set(r.user_id, {
            raw_ls: Number(r.raw_ls ?? 0),
            consistency: Number(r.consistency_multiplier ?? 1.0),
            tier_mult: 1.0,
          });
        }
        // Pull tier multipliers
        const { data: tierData } = await supabase
          .from('pplp_v25_tier_assignments')
          .select('user_id, tier_multiplier')
          .in('user_id', batch)
          .eq('is_current', true);
        for (const r of tierData ?? []) {
          const cur = v25Map.get(r.user_id) ?? { raw_ls: 0, consistency: 1.0, tier_mult: 1.0 };
          cur.tier_mult = Number(r.tier_multiplier ?? 1.0);
          v25Map.set(r.user_id, cur);
        }
      }
    }

    const allocations = eligibleUsers.map(u => {
      const v25 = v25Map.get(u.user_id);
      // Phương án A: thay hoàn toàn total_light bằng raw_ls khi có
      const baseScore = v25?.raw_ls ?? u.total_light;
      const tierMult = v25?.tier_mult ?? 1.0;
      const consistency = v25?.consistency ?? 1.0;
      const weighted = baseScore * tierMult * consistency;
      return { ...u, weighted, v25_raw_ls: v25?.raw_ls ?? 0, v25_tier_mult: tierMult };
    });

    console.log(`[V2.5] ${v25Map.size}/${eligibleUsers.length} users have v2.5 RawLS data`);
    const sumWeighted = allocations.reduce((s, a) => s + a.weighted, 0);
    const finalAllocs = allocations.map(a => {
      const userMint = (a.weighted / sumWeighted) * userPool;
      const instant = userMint * Number(cfg.instant_portion_pct);
      const locked = userMint * Number(cfg.locked_portion_pct);
      return {
        user_id: a.user_id,
        light_score_total: a.total_light,
        share_percent: (a.weighted / sumWeighted) * 100,
        allocation_amount: userMint,
        instant_amount: instant,
        locked_amount: locked,
        v2_contribution: a.v2,
      };
    });

    // === Upsert epoch ===
    const allocationBreakdown = {
      user_pool: userPool,
      ecosystem_pool: ecosystemPool,
      treasury_pool: treasuryPool,
      strategic_pool: strategicPool,
      resilience_pool: resiliencePool,
    };

    let epochId: string;
    const { data: existing } = await supabase
      .from('mint_epochs').select('id, status, snapshot_at').eq('epoch_month', epochMonth).maybeSingle();

    const isReSnapshot = !!existing;
    const snapshotIteration = isReSnapshot ? 2 : 1; // dùng để log
    console.log(`[EPOCH-SNAPSHOT] ${isReSnapshot ? 're-snapshot (delta-merge)' : 'first snapshot'} for ${epochMonth}`);

    const epochData = {
      mint_pool: finalMint,
      total_light_score: totalLight,
      eligible_users: eligibleUsers.length,
      status: 'snapshot',
      rules_version: 'MonetaryV1',
      snapshot_at: new Date().toISOString(),
      total_actions: allScores.length,
      unique_users: allScores.length,
      total_cap: finalMint,
      base_expansion: baseExpansion,
      contribution_expansion: contributionExpansion,
      ecosystem_expansion: ecosystemExpansion,
      discipline_modulator: modulator,
      final_mint: finalMint,
      system_stage: cfg.system_stage,
      soft_ceiling: SOFT_CEILING,
      verified_light_score: verifiedLightScore,
      verified_contribution_value: verifiedContributionValue,
      ecosystem_usage_index: ecosystemUsageIndex,
      active_quality_users: activeQualityUsers,
      allocation_breakdown: allocationBreakdown,
    };

    // Snapshot allocations CŨ trước khi xoá để tính delta cho vesting + treasury
    const prevAllocByUser = new Map<string, { allocation_amount: number; instant_amount: number; locked_amount: number; id: string }>();
    let prevTreasuryByVault = new Map<string, number>();

    if (isReSnapshot) {
      if (existing!.status === 'finalized') {
        return new Response(JSON.stringify({ error: 'Epoch already finalized' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      epochId = existing!.id;

      // Lưu allocations cũ để tính delta
      const { data: prevAllocs } = await supabase
        .from('mint_allocations')
        .select('id, user_id, allocation_amount, instant_amount, locked_amount')
        .eq('epoch_id', epochId).eq('is_eligible', true);
      for (const a of prevAllocs ?? []) {
        prevAllocByUser.set(a.user_id, {
          id: a.id,
          allocation_amount: Number(a.allocation_amount) || 0,
          instant_amount: Number(a.instant_amount) || 0,
          locked_amount: Number(a.locked_amount) || 0,
        });
      }

      // Lưu treasury_flows cũ đã credit cho epoch này
      const { data: prevFlows } = await supabase
        .from('treasury_flows').select('destination_vault, amount')
        .eq('reference_id', epochId).eq('source', 'epoch_snapshot');
      for (const f of prevFlows ?? []) {
        prevTreasuryByVault.set(
          f.destination_vault,
          (prevTreasuryByVault.get(f.destination_vault) || 0) + Number(f.amount),
        );
      }

      // Xoá allocations cũ và epoch_metrics cũ (sẽ tạo lại snapshot mới)
      await supabase.from('mint_allocations').delete().eq('epoch_id', epochId);
      await supabase.from('epoch_metrics').delete().eq('epoch_id', epochId);
      await supabase.from('mint_epochs').update({ ...epochData, updated_at: new Date().toISOString() }).eq('id', epochId);
    } else {
      const { data: newEp, error } = await supabase.from('mint_epochs').insert({
        epoch_date: `${epochMonth}-01`, epoch_month: epochMonth, total_minted: 0, ...epochData,
      }).select('id').single();
      if (error) throw error;
      epochId = newEp.id;
    }

    // === Insert allocations + vesting schedules ===
    const allocRows = finalAllocs.map(a => ({
      epoch_id: epochId,
      user_id: a.user_id,
      light_score_total: Math.round(a.light_score_total * 100) / 100,
      share_percent: Math.round(a.share_percent * 10000) / 10000,
      allocation_amount: Math.round(a.allocation_amount * 100) / 100,
      allocation_amount_capped: Math.floor(a.allocation_amount),
      instant_amount: Math.floor(a.instant_amount),
      locked_amount: Math.floor(a.locked_amount),
      trust_band: 'standard',
      is_eligible: true,
      reason_codes: a.v2_contribution > 0 ? ['EPOCH_ELIGIBLE', 'V2_PARTICIPANT', 'MONETARY_V1'] : ['EPOCH_ELIGIBLE', 'MONETARY_V1'],
      status: 'pending',
    }));

    const ineligibleRows = ineligibleUsers.map(u => ({
      epoch_id: epochId, user_id: u.user_id,
      light_score_total: Math.round(u.total_light * 100) / 100,
      share_percent: 0, allocation_amount: 0, allocation_amount_capped: 0,
      instant_amount: 0, locked_amount: 0,
      is_eligible: false, reason_codes: ['BELOW_MIN_LIGHT_THRESHOLD'], status: 'pending',
    }));
    const bannedRows = bannedScores.map(u => ({
      epoch_id: epochId, user_id: u.user_id,
      light_score_total: Math.round(u.total_light * 100) / 100,
      share_percent: 0, allocation_amount: 0, allocation_amount_capped: 0,
      instant_amount: 0, locked_amount: 0,
      is_eligible: false, reason_codes: ['FRAUD_BANNED'], status: 'pending',
    }));

    const allRows = [...allocRows, ...ineligibleRows, ...bannedRows];
    for (let i = 0; i < allRows.length; i += 500) {
      const { error } = await supabase.from('mint_allocations').insert(allRows.slice(i, i + 500));
      if (error) throw error;
    }

    // === Create vesting schedules for eligible users ===
    const releaseAt = new Date(Date.now() + Number(cfg.base_vesting_days) * 86400_000);
    const nextUnlock = new Date(Date.now() + Number(cfg.unlock_check_interval_days) * 86400_000);

    // Re-fetch allocations to get IDs
    const { data: insertedAllocs } = await supabase
      .from('mint_allocations').select('id, user_id, instant_amount, locked_amount')
      .eq('epoch_id', epochId).eq('is_eligible', true);

    if (insertedAllocs) {
      const vestingRows = insertedAllocs.map(a => ({
        user_id: a.user_id,
        allocation_id: a.id,
        epoch_id: epochId,
        total_amount: Number(a.instant_amount) + Number(a.locked_amount),
        instant_amount: Number(a.instant_amount),
        locked_amount: Number(a.locked_amount),
        released_amount: Number(a.instant_amount), // instant phần đã release
        remaining_locked: Number(a.locked_amount),
        release_at: releaseAt.toISOString(),
        next_unlock_check_at: nextUnlock.toISOString(),
        status: 'active',
        trust_band: 'standard',
      }));
      for (let i = 0; i < vestingRows.length; i += 500) {
        await supabase.from('reward_vesting_schedules').insert(vestingRows.slice(i, i + 500));
      }
    }

    // === Insert epoch_metrics ===
    await supabase.from('epoch_metrics').insert({
      epoch_id: epochId,
      epoch_label: epochMonth,
      verified_light_score: verifiedLightScore,
      verified_contribution_value: verifiedContributionValue,
      service_impact_score: serviceImpactScore,
      ecosystem_usage_index: ecosystemUsageIndex,
      active_quality_users: activeQualityUsers,
      utility_diversity_index: utilityDiversityIndex,
      raw_total_mint: totalMint,
      adjusted_mint: adjustedMint,
      final_mint: finalMint,
    });

    // === Treasury vault credits (Reward Reserve gets ecosystem+resilience initially) ===
    const treasuryFlows = [
      { vault: 'reward_reserve', amount: ecosystemPool + resiliencePool },
      { vault: 'infrastructure', amount: treasuryPool * 0.4 },
      { vault: 'community_growth', amount: treasuryPool * 0.3 },
      { vault: 'stability', amount: treasuryPool * 0.3 },
      { vault: 'strategic_expansion', amount: strategicPool },
    ];
    for (const f of treasuryFlows) {
      if (f.amount > 0) {
        await supabase.from('treasury_flows').insert({
          flow_type: 'epoch_allocation', source: 'epoch_snapshot',
          destination_vault: f.vault, amount: Math.floor(f.amount),
          reason: `Epoch ${epochMonth} allocation`, reference_table: 'mint_epochs', reference_id: epochId,
        });
        // Update vault balance
        const { data: v } = await supabase.from('treasury_vaults').select('balance, total_inflow').eq('vault_key', f.vault).single();
        if (v) {
          await supabase.from('treasury_vaults').update({
            balance: Number(v.balance) + Math.floor(f.amount),
            total_inflow: Number(v.total_inflow) + Math.floor(f.amount),
          }).eq('vault_key', f.vault);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, epoch_id: epochId, epoch_month: epochMonth,
      monetary: {
        base_expansion: Math.round(baseExpansion),
        contribution_expansion: Math.round(contributionExpansion),
        ecosystem_expansion: Math.round(ecosystemExpansion),
        total_mint: Math.round(totalMint),
        modulator,
        final_mint: Math.round(finalMint),
      },
      allocation: {
        user_pool: Math.round(userPool),
        ecosystem_pool: Math.round(ecosystemPool),
        treasury_pool: Math.round(treasuryPool),
        strategic_pool: Math.round(strategicPool),
        resilience_pool: Math.round(resiliencePool),
      },
      stats: {
        total_users: allScores.length,
        eligible_users: eligibleUsers.length,
        instant_total: Math.round(finalAllocs.reduce((s, a) => s + a.instant_amount, 0)),
        locked_total: Math.round(finalAllocs.reduce((s, a) => s + a.locked_amount, 0)),
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[EPOCH-SNAPSHOT v2] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
