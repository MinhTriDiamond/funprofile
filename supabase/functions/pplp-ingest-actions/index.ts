import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Allowed action types from Angel AI
const ALLOWED_ACTION_TYPES = [
  'QUESTION_ASK',
  'FEEDBACK_GIVE',
  'VISION_CREATE',
] as const;

// Base rewards for Angel AI actions (synced with pplp-types)
const BASE_REWARDS: Record<string, number> = {
  QUESTION_ASK: 50,
  FEEDBACK_GIVE: 60,
  VISION_CREATE: 1000,
};

const MAX_ACTIONS_PER_USER_PER_DAY = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: service-to-service API key ──
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('ANGEL_AI_INGEST_KEY');
    if (!expectedKey || !apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse body ──
    const body = await req.json();
    const { fun_profile_id, action_type, light_score, metadata, evidence_hash } = body;

    // ── Validate required fields ──
    if (!fun_profile_id || typeof fun_profile_id !== 'string') {
      return jsonError('fun_profile_id is required (string)', 400);
    }
    if (!action_type || !ALLOWED_ACTION_TYPES.includes(action_type)) {
      return jsonError(`action_type must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}`, 400);
    }
    if (light_score === undefined || typeof light_score !== 'number' || light_score < 0) {
      return jsonError('light_score must be a non-negative number', 400);
    }
    if (!evidence_hash || typeof evidence_hash !== 'string') {
      return jsonError('evidence_hash is required for deduplication', 400);
    }

    // ── Supabase admin client ──
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Check profile exists ──
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, is_banned')
      .eq('id', fun_profile_id)
      .maybeSingle();

    if (profileErr || !profile) {
      return jsonError('Profile not found in FUN.RICH', 404);
    }
    if (profile.is_banned) {
      return jsonError('User is banned', 403);
    }

    // ── Check duplicate via evidence_hash ──
    // We store evidence_hash in the reference_id field for angel_ai actions
    const { data: existing } = await supabase
      .from('light_actions')
      .select('id')
      .eq('reference_id', evidence_hash)
      .eq('reference_type', 'angel_ai')
      .maybeSingle();

    if (existing) {
      // Idempotent: return success without inserting
      return jsonOk({ message: 'Action already ingested', action_id: existing.id, duplicate: true });
    }

    // ── Rate limit: max actions per user per day from angel_ai ──
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('light_actions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', fun_profile_id)
      .eq('reference_type', 'angel_ai')
      .gte('created_at', todayStart.toISOString());

    if ((count ?? 0) >= MAX_ACTIONS_PER_USER_PER_DAY) {
      return jsonError(`Rate limit exceeded: max ${MAX_ACTIONS_PER_USER_PER_DAY} actions/day from Angel AI`, 429);
    }

    // ── Calculate scores ──
    const baseReward = BASE_REWARDS[action_type] ?? 50;
    const qualityScore = 1.0;
    const impactScore = 1.0;
    const integrityScore = 1.0;
    const unityMultiplier = 1.0;
    const finalLightScore = light_score > 0 ? light_score : baseReward;

    // ── Insert into light_actions ──
    const { data: inserted, error: insertErr } = await supabase
      .from('light_actions')
      .insert({
        user_id: fun_profile_id,
        actor_id: fun_profile_id,
        action_type: action_type.toLowerCase(),
        base_reward: baseReward,
        quality_score: qualityScore,
        impact_score: impactScore,
        integrity_score: integrityScore,
        unity_multiplier: unityMultiplier,
        unity_score: 0,
        light_score: finalLightScore,
        mint_amount: 0, // epoch-based flow
        mint_status: 'approved',
        is_eligible: true,
        reference_id: evidence_hash,
        reference_type: 'angel_ai',
        content_preview: metadata?.content_preview || `Angel AI: ${action_type}`,
        angel_evaluation: metadata || null,
      })
      .select('id, light_score, created_at')
      .single();

    if (insertErr) {
      console.error('[INGEST] Insert error:', insertErr);
      return jsonError('Failed to insert action: ' + insertErr.message, 500);
    }

    console.log(`[INGEST] Angel AI action ingested: user=${fun_profile_id} type=${action_type} score=${finalLightScore} id=${inserted.id}`);

    return jsonOk({
      message: 'Action ingested successfully',
      action_id: inserted.id,
      light_score: inserted.light_score,
      created_at: inserted.created_at,
      duplicate: false,
    });

  } catch (error: unknown) {
    console.error('[INGEST] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(message, 500);
  }
});

// ── Helpers ──
function jsonOk(data: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function jsonError(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
