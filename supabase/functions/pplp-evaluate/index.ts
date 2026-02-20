import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Base Rewards configuration
const BASE_REWARDS: Record<string, number> = {
  post: 100,
  comment: 20,
  reaction: 10,
  share: 50,
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

// Actions where beneficiary = post owner (not the actor)
// actor performs action → post owner receives reward
const BENEFICIARY_IS_POST_OWNER = new Set(['reaction', 'comment', 'share']);

// Calculate Unity Multiplier from Unity Score
function calculateUnityMultiplier(unityScore: number): number {
  return Math.max(0.5, Math.min(2.5, 0.5 + (unityScore / 50)));
}

// Calculate Light Score
function calculateLightScore(
  baseReward: number,
  qualityScore: number,
  impactScore: number,
  integrityScore: number,
  unityMultiplier: number
): number {
  return Math.round(baseReward * qualityScore * impactScore * integrityScore * unityMultiplier * 100) / 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token — actor is the person performing the action
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

    const actorId = user.id; // Người thực hiện hành động

    const { action_type, reference_id, content } = await req.json();

    if (!action_type || !BASE_REWARDS[action_type]) {
      return new Response(JSON.stringify({ error: 'Invalid action_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP] Evaluating ${action_type} for actor ${actorId}`);

    // === DETERMINE BENEFICIARY (người nhận thưởng) ===
    let beneficiaryId = actorId; // Mặc định: actor tự nhận thưởng (post, friend, new_user_bonus)

    if (BENEFICIARY_IS_POST_OWNER.has(action_type) && reference_id) {
      // reaction/comment/share → chủ bài nhận thưởng
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id, is_reward_eligible')
        .eq('id', reference_id)
        .maybeSingle();

      if (!postData) {
        console.log(`[PPLP] Post ${reference_id} not found. Skipping.`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'post_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Kiểm tra bài có eligible không (duplicate post check)
      if (postData.is_reward_eligible === false) {
        console.log(`[PPLP] Post ${reference_id} is not reward-eligible (duplicate). Skipping.`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'duplicate_content' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      beneficiaryId = postData.user_id;

      // === SELF-ACTION CHECK: actor = chủ bài → không thưởng ===
      if (actorId === beneficiaryId) {
        console.log(`[PPLP] Self-action detected: actor ${actorId} = post owner. Skipping.`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'self_action' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // === DUPLICATE CHECK: đã thưởng cho actor+post+action_type chưa? ===
      // Đây là check theo cặp (actor, post, type) — không phải daily count
      const { count: existingCount } = await supabase
        .from('light_actions')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', actorId)
        .eq('reference_id', reference_id)
        .eq('action_type', action_type);

      if (existingCount !== null && existingCount > 0) {
        console.log(`[PPLP] Duplicate action: actor ${actorId} already rewarded for ${action_type} on post ${reference_id}`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_rewarded' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // === DUPLICATE POST CHECK (for post action_type) ===
    if (action_type === 'post' && reference_id) {
      const { data: postData } = await supabase
        .from('posts')
        .select('is_reward_eligible')
        .eq('id', reference_id)
        .maybeSingle();

      if (postData && postData.is_reward_eligible === false) {
        console.log(`[PPLP] Post ${reference_id} is not reward-eligible (duplicate). Skipping.`);
        return new Response(JSON.stringify({
          success: true,
          skipped: true,
          reason: 'duplicate_content',
          light_action: {
            action_type,
            light_score: 0,
            is_eligible: false,
            mint_amount: 0,
            evaluation: {
              quality: 0, impact: 0, integrity: 0, unity: 0, unity_multiplier: 0,
              reasoning: 'Bài viết trùng nội dung, không tính điểm.',
            },
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // === DAILY CAP CHECK (per actor, per action_type) ===
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('light_actions')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', actorId)
      .eq('action_type', action_type)
      .gte('created_at', `${today}T00:00:00Z`);

    // Fallback: nếu actor_id chưa có data (actions cũ), dùng user_id
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
        current: totalTodayCount
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get beneficiary stats for AI context
    const { data: userStats } = await supabase
      .from('light_reputation')
      .select('*')
      .eq('user_id', beneficiaryId)
      .single();

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

    // Calculate scores
    const baseReward = BASE_REWARDS[action_type];
    const unityMultiplier = calculateUnityMultiplier(evaluation.unity_score);
    const lightScore = calculateLightScore(
      baseReward,
      evaluation.quality_score,
      evaluation.impact_score,
      evaluation.integrity_score,
      unityMultiplier
    );

    // Determine eligibility
    const isEligible = lightScore >= 10 && evaluation.integrity_score >= 0.3;
    const mintAmount = isEligible ? Math.floor(lightScore) : 0;

    // Insert light action record
    // user_id = beneficiaryId (người nhận thưởng)
    // actor_id = actorId (người thực hiện)
    const { data: lightAction, error: insertError } = await supabase
      .from('light_actions')
      .insert({
        user_id: beneficiaryId,         // Người nhận thưởng (chủ bài hoặc actor)
        actor_id: actorId,              // Người thực hiện hành động
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
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate action)
      if (insertError.code === '23505') {
        console.log(`[PPLP] Unique constraint: actor ${actorId} already has ${action_type} for ${reference_id}`);
        return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_rewarded' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[PPLP] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record action' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP] Action recorded: ${lightAction.id}, Beneficiary: ${beneficiaryId}, Score: ${lightScore}, Eligible: ${isEligible}`);

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
