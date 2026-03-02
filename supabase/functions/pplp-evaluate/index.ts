import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Base Rewards configuration
// Base Rewards synced with src/config/pplp.ts
const BASE_REWARDS: Record<string, number> = {
  post: 50,
  comment: 10,
  reaction: 10,
  share: 10,
  friend: 20,
  livestream: 200,
  new_user_bonus: 500,
};

// Daily caps per action (per actor per day)
const DAILY_CAPS: Record<string, { maxActions: number }> = {
  post: { maxActions: 10 },
  comment: { maxActions: 50 },
  reaction: { maxActions: 50 },
  share: { maxActions: 10 },
  friend: { maxActions: 10 },
  livestream: { maxActions: 5 },
  new_user_bonus: { maxActions: 1 },
};

// LS-Math-v1.0 constants
const LS_MATH = {
  consistency: { beta: 0.6, lambda: 30 },
  sequence: { eta: 0.5, kappa: 5 },
  penalty: { theta: 0.8, max_penalty: 0.5 },
};

// Actions where beneficiary = post owner (not the actor)
const BENEFICIARY_IS_POST_OWNER = new Set(['reaction', 'comment', 'share']);

// Calculate Unity Multiplier from Unity Score
function calculateUnityMultiplier(unityScore: number): number {
  return Math.max(0.5, Math.min(2.5, 0.5 + (unityScore / 50)));
}

// LS-Math-v1.0: Consistency Multiplier
function calculateConsistencyMultiplier(streakDays: number): number {
  const { beta, lambda } = LS_MATH.consistency;
  return 1 + beta * (1 - Math.exp(-streakDays / lambda));
}

// LS-Math-v1.0: Sequence Multiplier
function calculateSequenceMultiplier(bonus: number): number {
  const { eta, kappa } = LS_MATH.sequence;
  return 1 + eta * Math.tanh(bonus / kappa);
}

// LS-Math-v1.0: Integrity Penalty
function calculateIntegrityPenalty(integrityScore: number): number {
  const { theta, max_penalty } = LS_MATH.penalty;
  const risk = 1 - integrityScore;
  return 1 - Math.min(max_penalty, theta * risk);
}

// Calculate Light Score with LS-Math-v1.0 multipliers
function calculateLightScore(
  baseReward: number,
  qualityScore: number,
  impactScore: number,
  integrityScore: number,
  unityMultiplier: number,
  consistencyMultiplier: number,
  sequenceMultiplier: number,
  integrityPenalty: number,
): number {
  return Math.round(
    baseReward * qualityScore * impactScore * integrityScore * unityMultiplier
    * consistencyMultiplier * sequenceMultiplier * integrityPenalty * 100
  ) / 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actorId = user.id;
    const { action_type, reference_id, content } = await req.json();

    if (!action_type || !BASE_REWARDS[action_type]) {
      return new Response(JSON.stringify({ error: 'Invalid action_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP] Evaluating ${action_type} for actor ${actorId}`);

    // === DETERMINE BENEFICIARY ===
    let beneficiaryId = actorId;

    if (BENEFICIARY_IS_POST_OWNER.has(action_type) && reference_id) {
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id, is_reward_eligible')
        .eq('id', reference_id)
        .maybeSingle();

      if (!postData) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'post_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (postData.is_reward_eligible === false) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'duplicate_content' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      beneficiaryId = postData.user_id;

      if (actorId === beneficiaryId) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'self_action' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { count: existingCount } = await supabase
        .from('light_actions')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', actorId)
        .eq('reference_id', reference_id)
        .eq('action_type', action_type);

      if (existingCount !== null && existingCount > 0) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_rewarded' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // === DUPLICATE POST CHECK ===
    if (action_type === 'post' && reference_id) {
      const { data: postData } = await supabase
        .from('posts')
        .select('is_reward_eligible')
        .eq('id', reference_id)
        .maybeSingle();

      if (postData && postData.is_reward_eligible === false) {
        return new Response(JSON.stringify({
          success: true, skipped: true, reason: 'duplicate_content',
          light_action: {
            action_type, light_score: 0, is_eligible: false, mint_amount: 0,
            evaluation: { quality: 0, impact: 0, integrity: 0, unity: 0, unity_multiplier: 0, reasoning: 'Bài viết trùng nội dung.' },
          },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // === DAILY CAP CHECK ===
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('light_actions')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', actorId)
      .eq('action_type', action_type)
      .gte('created_at', `${today}T00:00:00Z`);

    const { count: todayCountFallback } = await supabase
      .from('light_actions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', actorId)
      .eq('action_type', action_type)
      .is('actor_id', null)
      .gte('created_at', `${today}T00:00:00Z`);

    const totalTodayCount = (todayCount || 0) + (todayCountFallback || 0);

    if (totalTodayCount >= DAILY_CAPS[action_type].maxActions) {
      return new Response(JSON.stringify({
        error: 'Daily limit reached for this action type',
        limit: DAILY_CAPS[action_type].maxActions,
        current: totalTodayCount,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === GET BENEFICIARY REPUTATION (including streak) ===
    const { data: userStats } = await supabase
      .from('light_reputation')
      .select('*, consistency_streak, last_active_date, sequence_bonus')
      .eq('user_id', beneficiaryId)
      .single();

    // === LS-Math-v1.0: COMPUTE MULTIPLIERS ===
    const currentStreak = userStats?.consistency_streak ?? 0;
    const sequenceBonus = userStats?.sequence_bonus ?? 0;

    const consistencyMultiplier = calculateConsistencyMultiplier(currentStreak);
    const sequenceMultiplier = calculateSequenceMultiplier(sequenceBonus);

    // === AI EVALUATION ===
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    let evaluation = {
      quality_score: 1.0,
      impact_score: 1.0,
      integrity_score: 1.0,
      unity_score: 50,
      reasoning: 'Default evaluation - AI unavailable',
    };

    if (LOVABLE_API_KEY && content) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Bạn là ANGEL AI - Light Oracle của FUN Ecosystem.
Nhiệm vụ: Đánh giá hành động người dùng theo 5 Pillars of Light của PPLP:
1. Service to Life (Phụng sự sự sống)
2. Transparent Truth (Chân thật minh bạch) 
3. Healing & Love (Chữa lành & yêu thương)
4. Long-term Value (Đóng góp bền vững)
5. Unity (Hợp Nhất)

Trả về JSON object với các trường sau:
- quality_score: 0.5-3.0 (chất lượng nội dung, 1.0 = bình thường, 3.0 = xuất sắc)
- impact_score: 0.5-5.0 (tác động cộng đồng, 1.0 = bình thường, 5.0 = rất lớn)
- integrity_score: 0-1.0 (độ tin cậy, 0 = spam/bot, 1.0 = hoàn toàn tin cậy)
- unity_score: 0-100 (mức độ tạo Hợp Nhất trong cộng đồng)
- reasoning: string (giải thích ngắn gọn bằng tiếng Việt)

CHỈ trả về JSON, không có text khác.`
              },
              {
                role: 'user',
                content: `ACTION TYPE: ${action_type}
CONTENT: ${content || 'N/A'}
USER TIER: ${userStats?.tier || 0}
USER ACTIONS COUNT: ${userStats?.actions_count || 0}
USER AVG QUALITY: ${userStats?.avg_quality || 1.0}
STREAK DAYS: ${currentStreak}

Đánh giá hành động này.`
              }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content;

          if (aiContent) {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              evaluation = {
                quality_score: Math.max(0.5, Math.min(3.0, parsed.quality_score || 1.0)),
                impact_score: Math.max(0.5, Math.min(5.0, parsed.impact_score || 1.0)),
                integrity_score: Math.max(0, Math.min(1.0, parsed.integrity_score || 1.0)),
                unity_score: Math.max(0, Math.min(100, parsed.unity_score || 50)),
                reasoning: parsed.reasoning || 'AI evaluation completed',
              };
              console.log('[PPLP] AI Evaluation:', evaluation);
            }
          }
        } else {
          console.error('[PPLP] AI Gateway error:', aiResponse.status);
        }
      } catch (aiError) {
        console.error('[PPLP] AI evaluation error:', aiError);
      }
    }

    // === LS-Math-v1.0: INTEGRITY PENALTY ===
    const integrityPenalty = calculateIntegrityPenalty(evaluation.integrity_score);

    // === CALCULATE FINAL SCORE ===
    const baseReward = BASE_REWARDS[action_type];
    const unityMultiplier = calculateUnityMultiplier(evaluation.unity_score);
    const lightScore = calculateLightScore(
      baseReward,
      evaluation.quality_score,
      evaluation.impact_score,
      evaluation.integrity_score,
      unityMultiplier,
      consistencyMultiplier,
      sequenceMultiplier,
      integrityPenalty,
    );

    const isEligible = lightScore >= 0.5 && evaluation.integrity_score >= 0.3;
    // EPOCH-BASED: mint_amount is set to 0. User claims via mint_allocations after epoch snapshot.
    const mintAmount = 0;

    console.log(`[PPLP] LS-Math: streak=${currentStreak} M_cons=${consistencyMultiplier.toFixed(3)} M_seq=${sequenceMultiplier.toFixed(3)} penalty=${integrityPenalty.toFixed(3)} final=${lightScore}`);

    // === INSERT LIGHT ACTION ===
    const { data: lightAction, error: insertError } = await supabase
      .from('light_actions')
      .insert({
        user_id: beneficiaryId,
        actor_id: actorId,
        action_type,
        reference_id: reference_id || null,
        reference_type: action_type,
        content_preview: content?.substring(0, 200) || null,
        base_reward: baseReward,
        quality_score: evaluation.quality_score,
        impact_score: evaluation.impact_score,
        integrity_score: evaluation.integrity_score,
        unity_score: evaluation.unity_score,
        unity_multiplier: unityMultiplier,
        light_score: lightScore,
        is_eligible: isEligible,
        mint_status: isEligible ? 'approved' : 'rejected',
        mint_amount: mintAmount,
        angel_evaluation: evaluation,
        evaluated_at: new Date().toISOString(),
        // LS-Math-v1.0 audit trail
        consistency_multiplier: consistencyMultiplier,
        sequence_multiplier: sequenceMultiplier,
        integrity_penalty: integrityPenalty,
        streak_days: currentStreak,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_rewarded' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[PPLP] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record action' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === UPDATE STREAK in light_reputation ===
    const todayDate = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastActiveDate = userStats?.last_active_date;

    let newStreak = 1;
    if (lastActiveDate === todayDate) {
      newStreak = currentStreak; // Already counted today
    } else if (lastActiveDate === yesterday) {
      newStreak = currentStreak + 1; // Consecutive day
    }
    // else: reset to 1

    await supabase
      .from('light_reputation')
      .upsert({
        user_id: beneficiaryId,
        consistency_streak: newStreak,
        last_active_date: todayDate,
      }, { onConflict: 'user_id', ignoreDuplicates: false });

    console.log(`[PPLP] Action recorded: ${lightAction.id}, Beneficiary: ${beneficiaryId}, Score: ${lightScore}, Streak: ${newStreak}`);

    return new Response(JSON.stringify({
      success: true,
      light_action: {
        id: lightAction.id,
        action_type,
        light_score: lightScore,
        is_eligible: isEligible,
        mint_amount: mintAmount,
        beneficiary_id: beneficiaryId,
        actor_id: actorId,
        evaluation: {
          quality: evaluation.quality_score,
          impact: evaluation.impact_score,
          integrity: evaluation.integrity_score,
          unity: evaluation.unity_score,
          unity_multiplier: unityMultiplier,
          consistency_multiplier: consistencyMultiplier,
          sequence_multiplier: sequenceMultiplier,
          integrity_penalty: integrityPenalty,
          streak_days: newStreak,
          reasoning: evaluation.reasoning,
        },
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[PPLP] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
