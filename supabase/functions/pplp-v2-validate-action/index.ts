import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ANGEL_AI_ENDPOINT = "https://ssjoetiitctqzapymtzl.supabase.co/functions/v1/angel-chat";
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ANGEL_TIMEOUT_MS = 15000;

const HIGH_IMPACT_CODES = ['SOCIAL_IMPACT', 'SERVICE', 'GIVING'];
const MAX_HIGH_IMPACT_ACTIONS_PER_DAY = 3;

const PPLP_DEFINITION = 'Proof of Pure Love Protocol — Truth Validation Engine v2';

// Impact weights by action type
const IMPACT_WEIGHTS: Record<string, number> = {
  INNER_WORK: 0.8,
  CHANNELING: 1.0,
  GIVING: 1.2,
  SOCIAL_IMPACT: 1.2,
  SERVICE: 1.3,
  LEARNING: 0.9,
};

interface PillarScores {
  serving_life: number;
  transparent_truth: number;
  healing_love: number;
  long_term_value: number;
  unity_over_separation: number;
}

function buildValidationPrompt(action: any, proofs: any[]): string {
  const proofDescriptions = proofs.map(p => {
    const parts = [`Loại: ${p.proof_type}`];
    if (p.proof_url) parts.push(`URL: ${p.proof_url}`);
    if (p.extracted_text) parts.push(`Nội dung: ${p.extracted_text}`);
    if (p.external_ref) parts.push(`Ref: ${p.external_ref}`);
    return parts.join(', ');
  }).join('\n');

  return `Bạn là hệ thống PPLP (Proof of Pure Love Protocol) — Truth Validation Engine.

Nhiệm vụ: Đánh giá hành động của user theo 5 trụ cột (pillars), mỗi trụ cho điểm 0-10.

5 TRỤ CỘT:
1. serving_life (Phụng sự sự sống): Hành động này phụng sự cuộc sống, giúp ích người khác như thế nào?
2. transparent_truth (Chân thật minh bạch): Bằng chứng có xác thực không? Mô tả có trung thực không?
3. healing_love (Chữa lành & yêu thương): Hành động có mang năng lượng yêu thương, chữa lành không?
4. long_term_value (Giá trị bền vững): Hành động có tạo ra giá trị lâu dài cho cộng đồng không?
5. unity_over_separation (Hợp nhất): Hành động có thúc đẩy sự đoàn kết, kết nối không?

QUY TẮC:
- Nếu KHÔNG có bằng chứng → tất cả pillars = 0
- Nếu bằng chứng giả/không liên quan → transparent_truth = 0
- Nếu transparent_truth < 3 → cần manual_review
- Điểm phải phản ánh THỰC TẾ, không nâng điểm vì lý do cảm xúc

HÀNH ĐỘNG CẦN ĐÁNH GIÁ:
- Loại: ${action.action_type_code}
- Tiêu đề: ${action.title}
- Mô tả: ${action.description || '(không có)'}
- Nguồn: ${action.source_url || '(không có)'}

BẰNG CHỨNG:
${proofDescriptions || '(Không có bằng chứng)'}

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
{
  "serving_life": <0-10>,
  "transparent_truth": <0-10>,
  "healing_love": <0-10>,
  "long_term_value": <0-10>,
  "unity_over_separation": <0-10>,
  "confidence": <0.0-1.0>,
  "reasoning": "<giải thích ngắn gọn bằng tiếng Việt>",
  "flags": []
}`;
}

async function callAngelAI(prompt: string): Promise<string | null> {
  const ANGEL_AI_API_KEY = Deno.env.get("ANGEL_AI_API_KEY");
  if (!ANGEL_AI_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANGEL_TIMEOUT_MS);

  try {
    const resp = await fetch(ANGEL_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": ANGEL_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    
    if (contentType.includes("text/event-stream")) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.content || parsed.text || parsed.delta?.content || parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch { /* partial */ }
        }
      }
      return fullText;
    } else {
      const json = await resp.json();
      return json.response || json.content || json.message || JSON.stringify(json);
    }
  } catch (e) {
    clearTimeout(timeout);
    console.warn('[PPLP v2 Validate] Angel AI failed:', e);
    return null;
  }
}

async function callLovableAI(prompt: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    const resp = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are PPLP Truth Validation Engine. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!resp.ok) return null;
    const json = await resp.json();
    return json.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn('[PPLP v2 Validate] Lovable AI failed:', e);
    return null;
  }
}

function parseAIResponse(text: string): PillarScores & { confidence: number; reasoning: string; flags: string[] } {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  
  const clamp = (v: unknown, min: number, max: number): number => {
    const n = Number(v) || 0;
    return Math.max(min, Math.min(max, n));
  };

  return {
    serving_life: clamp(parsed.serving_life, 0, 10),
    transparent_truth: clamp(parsed.transparent_truth, 0, 10),
    healing_love: clamp(parsed.healing_love, 0, 10),
    long_term_value: clamp(parsed.long_term_value, 0, 10),
    unity_over_separation: clamp(parsed.unity_over_separation, 0, 10),
    confidence: clamp(parsed.confidence, 0, 1),
    reasoning: String(parsed.reasoning || ''),
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
  };
}

function calculateConsistencyMultiplier(streakDays: number): number {
  if (streakDays >= 90) return 1.20;
  if (streakDays >= 30) return 1.10;
  if (streakDays >= 7) return 1.05;
  return 1.0;
}

// --- NEW: isDuplicateProof check ---
async function isDuplicateProof(supabase: any, actionId: string, proofs: any[]): Promise<boolean> {
  for (const proof of proofs) {
    if (proof.proof_url) {
      const { count } = await supabase
        .from('pplp_v2_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('proof_url', proof.proof_url)
        .neq('action_id', actionId);
      if ((count ?? 0) > 0) return true;
    }
    if (proof.file_hash) {
      const { count } = await supabase
        .from('pplp_v2_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('file_hash', proof.file_hash)
        .neq('action_id', actionId);
      if ((count ?? 0) > 0) return true;
    }
  }
  return false;
}

// --- NEW: exceedsVelocityLimits check ---
async function exceedsVelocityLimits(supabase: any, userId: string, actionTypeCode: string): Promise<boolean> {
  if (!HIGH_IMPACT_CODES.includes(actionTypeCode)) return false;

  const now = new Date();
  const vnOffset = 7 * 60 * 60 * 1000;
  const vnNow = new Date(now.getTime() + vnOffset);
  const vnStartOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));
  const utcStartOfDay = new Date(vnStartOfDay.getTime() - vnOffset);

  const { count } = await supabase
    .from('pplp_v2_user_actions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('action_type_code', HIGH_IMPACT_CODES)
    .in('status', ['validated', 'minted'])
    .gte('created_at', utcStartOfDay.toISOString());

  return (count ?? 0) >= MAX_HIGH_IMPACT_ACTIONS_PER_DAY;
}

// --- NEW: Trust level update functions ---
async function increaseTrustForVerifiedConsistency(supabase: any, userId: string): Promise<void> {
  const { data } = await supabase.from('profiles').select('trust_level').eq('id', userId).single();
  const current = Number(data?.trust_level) || 1.0;
  const newLevel = Math.min(1.25, current + 0.01);
  await supabase.from('profiles').update({ trust_level: newLevel }).eq('id', userId);
}

async function decayTrustForSpam(supabase: any, userId: string): Promise<void> {
  const { data } = await supabase.from('profiles').select('trust_level').eq('id', userId).single();
  const current = Number(data?.trust_level) || 1.0;
  const newLevel = Math.max(1.0, current - 0.05);
  await supabase.from('profiles').update({ trust_level: newLevel }).eq('id', userId);
}

async function addToLifetimeLightScore(supabase: any, userId: string, score: number): Promise<void> {
  const { data } = await supabase.from('profiles').select('total_light_score').eq('id', userId).single();
  const current = Number(data?.total_light_score) || 0;
  await supabase.from('profiles').update({ total_light_score: current + score }).eq('id', userId);
}

// --- SHA-256 for validationDigest ---
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { action_id, force_manual_review } = await req.json();
    if (!action_id) {
      return new Response(JSON.stringify({ code: 'VALIDATION', message: 'action_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- force_manual_review: skip AI, set manual_review immediately ---
    if (force_manual_review === true) {
      const { data: action } = await supabase.from('pplp_v2_user_actions').select('user_id').eq('id', action_id).single();
      if (!action) {
        return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Action not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const forceValidation = {
        action_id,
        serving_life: 0, transparent_truth: 0, healing_love: 0,
        long_term_value: 0, unity_over_separation: 0,
        ai_score: 0, community_score: 0, trust_signal_score: 0,
        raw_light_score: 0, final_light_score: 0, confidence: 0,
        explanation: { reasoning: 'Forced manual review by admin/moderator' },
        flags: ['FORCE_MANUAL_REVIEW'],
        validation_status: 'manual_review',
        validated_at: new Date().toISOString(),
        validator_type: 'system',
      };
      await supabase.from('pplp_v2_validations').insert(forceValidation);
      await supabase.from('pplp_v2_user_actions').update({ status: 'under_review' }).eq('id', action_id);
      return new Response(JSON.stringify({
        success: true, action_id, validation_status: 'manual_review',
        message: 'Hành động đã được chuyển sang review thủ công.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch action + proofs
    const { data: action, error: actionErr } = await supabase
      .from('pplp_v2_user_actions')
      .select('*')
      .eq('id', action_id)
      .single();

    if (actionErr || !action) {
      return new Response(JSON.stringify({ error: 'Action not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: proofs } = await supabase
      .from('pplp_v2_proofs')
      .select('*')
      .eq('action_id', action_id);

    // NO PROOF → NO SCORE (immutable rule)
    if (!proofs || proofs.length === 0) {
      const zeroValidation = {
        action_id,
        serving_life: 0, transparent_truth: 0, healing_love: 0,
        long_term_value: 0, unity_over_separation: 0,
        ai_score: 0, community_score: 0, trust_signal_score: 0,
        raw_light_score: 0, final_light_score: 0, confidence: 0,
        explanation: { reasoning: 'No proof attached — NO PROOF NO SCORE rule applied' },
        flags: ['NO_PROOF'],
        validation_status: 'rejected',
        validated_at: new Date().toISOString(),
        validator_type: 'system',
      };

      await supabase.from('pplp_v2_validations').insert(zeroValidation);
      await supabase.from('pplp_v2_user_actions').update({ status: 'rejected' }).eq('id', action_id);

      return new Response(JSON.stringify({
        success: false,
        reason: 'NO_PROOF_NO_SCORE',
        light_score: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- NEW: isDuplicateProof check ---
    const duplicateProof = await isDuplicateProof(supabase, action_id, proofs);

    // --- NEW: exceedsVelocityLimits check ---
    const velocityExceeded = await exceedsVelocityLimits(supabase, action.user_id, action.action_type_code);

    // Initialize flagsList BEFORE attendance block (BUG FIX: was declared after usage)
    const flagsList: string[] = [];

    if (duplicateProof) {
      flagsList.push('DUPLICATE_PROOF');
    }
    if (velocityExceeded) {
      flagsList.push('HIGH_IMPACT_VELOCITY_EXCEEDED');
    }

    // If duplicate proof or velocity exceeded → manual_review
    if (duplicateProof || velocityExceeded) {
      const reviewValidation = {
        action_id,
        serving_life: 0, transparent_truth: 0, healing_love: 0,
        long_term_value: 0, unity_over_separation: 0,
        ai_score: 0, community_score: 0, trust_signal_score: 0,
        raw_light_score: 0, final_light_score: 0, confidence: 0,
        explanation: { reasoning: `Auto-flagged: ${flagsList.join(', ')}` },
        flags: flagsList,
        validation_status: 'manual_review',
        validated_at: new Date().toISOString(),
        validator_type: 'system',
      };
      await supabase.from('pplp_v2_validations').insert(reviewValidation);
      await supabase.from('pplp_v2_user_actions').update({ status: 'under_review' }).eq('id', action_id);

      // Decay trust for spam if duplicate proof
      if (duplicateProof) {
        await decayTrustForSpam(supabase, action.user_id);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'manual_review',
        flags: flagsList,
        message: 'Hành động cần được xem xét thủ công.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build prompt and call AI
    const prompt = buildValidationPrompt(action, proofs);
    console.log(`[PPLP v2 Validate] Calling Angel AI for action ${action_id}`);

    let aiText = await callAngelAI(prompt);
    let validatorUsed = 'angel_ai';

    if (!aiText) {
      console.log(`[PPLP v2 Validate] Angel AI unavailable, falling back to Lovable AI`);
      aiText = await callLovableAI(prompt);
      validatorUsed = 'lovable_ai';
    }

    if (!aiText) {
      const pendingValidation = {
        action_id,
        serving_life: 0, transparent_truth: 0, healing_love: 0,
        long_term_value: 0, unity_over_separation: 0,
        ai_score: 0, community_score: 5, trust_signal_score: 5,
        raw_light_score: 0, final_light_score: 0, confidence: 0,
        explanation: { reasoning: 'AI validation unavailable — queued for manual review' },
        flags: ['AI_UNAVAILABLE'],
        validation_status: 'manual_review',
        validator_type: 'system',
      };
      await supabase.from('pplp_v2_validations').insert(pendingValidation);

      return new Response(JSON.stringify({
        success: true,
        status: 'manual_review',
        message: 'AI không khả dụng. Hành động sẽ được review thủ công.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse AI response
    let aiScores: ReturnType<typeof parseAIResponse>;
    try {
      aiScores = parseAIResponse(aiText);
    } catch (parseErr) {
      console.error('[PPLP v2 Validate] Failed to parse AI response:', aiText);
      const pendingValidation = {
        action_id,
        serving_life: 0, transparent_truth: 0, healing_love: 0,
        long_term_value: 0, unity_over_separation: 0,
        ai_score: 0, community_score: 5, trust_signal_score: 5,
        raw_light_score: 0, final_light_score: 0, confidence: 0,
        explanation: { reasoning: 'AI response unparseable', raw: aiText.slice(0, 500) },
        flags: ['PARSE_ERROR'],
        validation_status: 'manual_review',
        validator_type: 'system',
      };
      await supabase.from('pplp_v2_validations').insert(pendingValidation);

      return new Response(JSON.stringify({
        success: true,
        status: 'manual_review',
        message: 'Kết quả AI không hợp lệ. Hành động sẽ được review thủ công.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Add AI flags to our flagsList
    flagsList.push(...aiScores.flags);

    // Trust signal score — use trust_level from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at, trust_level')
      .eq('id', action.user_id)
      .single();
    const profileTrustLevel = Number(profile?.trust_level) || 1.0;
    // Map trust_level (1.0-1.25) to a 0-10 score for weighted combination
    const trustScore = Math.min(10, 5.0 + (profileTrustLevel - 1.0) * 20); // 1.0→5, 1.25→10

    // Community score — check if real reviews exist
    let communityScore = 5.0;
    const { data: reviews } = await supabase.from('pplp_v2_community_reviews')
      .select('endorse_score, flag_score').eq('action_id', action_id);
    if (reviews && reviews.length >= 3) {
      const avgEndorse = reviews.reduce((s: number, r: any) => s + Number(r.endorse_score), 0) / reviews.length;
      const avgFlag = reviews.reduce((s: number, r: any) => s + Number(r.flag_score), 0) / reviews.length;
      communityScore = Math.max(0, Math.min(10, avgEndorse - avgFlag));
    }

    // Attendance-based participation factor
    let attendanceMultiplier = 1.0;
    if (action.raw_metadata?.attendance_id) {
      const { data: att } = await supabase.from('pplp_v2_attendance')
        .select('participation_factor, confirmed_by_leader')
        .eq('id', action.raw_metadata.attendance_id)
        .single();
      if (att) {
        attendanceMultiplier = 1.0 + (Number(att.participation_factor) || 0) * 0.3;
        if (!att.confirmed_by_leader) {
          flagsList.push('ATTENDANCE_UNCONFIRMED');
        }
      }
    }

    // Weighted final pillars: AI 60% + Community 20% + Trust 20%
    const finalPillars: PillarScores = {
      serving_life: aiScores.serving_life * 0.6 + communityScore * 0.2 + trustScore * 0.2,
      transparent_truth: aiScores.transparent_truth * 0.6 + communityScore * 0.2 + trustScore * 0.2,
      healing_love: aiScores.healing_love * 0.6 + communityScore * 0.2 + trustScore * 0.2,
      long_term_value: aiScores.long_term_value * 0.6 + communityScore * 0.2 + trustScore * 0.2,
      unity_over_separation: aiScores.unity_over_separation * 0.6 + communityScore * 0.2 + trustScore * 0.2,
    };

    // MULTIPLICATIVE FORMULA: (S × T × L × V × U) / 10^4
    const rawLightScore = (
      finalPillars.serving_life *
      finalPillars.transparent_truth *
      finalPillars.healing_love *
      finalPillars.long_term_value *
      finalPillars.unity_over_separation
    ) / 10000;

    // Multipliers
    const impactWeight = IMPACT_WEIGHTS[action.action_type_code] || 1.0;
    const trustMultiplier = profileTrustLevel; // Use actual trust_level (1.0-1.25)

    // Streak calculation
    const { count: recentActions } = await supabase
      .from('pplp_v2_user_actions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', action.user_id)
      .eq('status', 'validated')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const streakDays = recentActions || 0;
    const consistencyMultiplier = calculateConsistencyMultiplier(streakDays);

    const finalLightScore = rawLightScore * impactWeight * trustMultiplier * consistencyMultiplier * attendanceMultiplier;

    // Safety rules
    let validationStatus: string;
    let actionStatus: string;

    if (aiScores.transparent_truth < 3) {
      validationStatus = 'manual_review';
      actionStatus = 'under_review';
      flagsList.push('LOW_TRUTH_SCORE');
    } else if (aiScores.serving_life === 0 || aiScores.healing_love === 0) {
      validationStatus = 'rejected';
      actionStatus = 'rejected';
      flagsList.push('ZERO_PILLAR');
    } else {
      validationStatus = 'validated';
      actionStatus = 'validated';
    }

    // Insert validation
    await supabase.from('pplp_v2_validations').insert({
      action_id,
      ...finalPillars,
      ai_score: (aiScores.serving_life + aiScores.transparent_truth + aiScores.healing_love + aiScores.long_term_value + aiScores.unity_over_separation) / 5,
      community_score: communityScore,
      trust_signal_score: trustScore,
      raw_light_score: rawLightScore,
      final_light_score: finalLightScore,
      confidence: aiScores.confidence,
      explanation: {
        reasoning: aiScores.reasoning,
        validator: validatorUsed,
        impact_weight: impactWeight,
        trust_multiplier: trustMultiplier,
        consistency_multiplier: consistencyMultiplier,
        streak_days: streakDays,
        attendance_multiplier: attendanceMultiplier,
        profile_trust_level: profileTrustLevel,
      },
      flags: flagsList,
      validation_status: validationStatus,
      validated_at: new Date().toISOString(),
      validator_type: 'ai',
    });

    // Update action status
    await supabase.from('pplp_v2_user_actions').update({ status: actionStatus }).eq('id', action_id);

    // --- NEW: Update trust & lifetime score on validated ---
    if (validationStatus === 'validated') {
      await increaseTrustForVerifiedConsistency(supabase, action.user_id);
      await addToLifetimeLightScore(supabase, action.user_id, finalLightScore);
    } else if (validationStatus === 'rejected' && flagsList.includes('ZERO_PILLAR')) {
      await decayTrustForSpam(supabase, action.user_id);
    }

    // Mint calculation (only if validated)
    let mintRecord = null;
    if (validationStatus === 'validated' && finalLightScore > 0) {
      const BASE_MINT_RATE = 10;
      const mintAmountTotal = BASE_MINT_RATE * finalLightScore;
      const mintAmountUser = Math.floor(mintAmountTotal * 99) / 100; // 99%
      const mintAmountPlatform = mintAmountTotal - mintAmountUser; // 1%

      // --- NEW: Build full validationDigest per pseudocode ---
      const pplpScores = {
        S: finalPillars.serving_life,
        T: finalPillars.transparent_truth,
        L: finalPillars.healing_love,
        V: finalPillars.long_term_value,
        U: finalPillars.unity_over_separation,
      };
      const digestPayload = JSON.stringify({
        actionId: action_id,
        userId: action.user_id,
        finalLightScore,
        totalMint: mintAmountTotal,
        pplpScores,
        definition: PPLP_DEFINITION,
      });
      const validationDigest = await sha256(digestPayload);

      const { data: mint } = await supabase.from('pplp_v2_mint_records').insert({
        action_id,
        user_id: action.user_id,
        light_score: finalLightScore,
        base_mint_rate: BASE_MINT_RATE,
        mint_amount_total: mintAmountTotal,
        mint_amount_user: mintAmountUser,
        mint_amount_platform: mintAmountPlatform,
        release_mode: 'instant',
        claimable_now: mintAmountUser,
        locked_amount: 0,
        status: 'pending',
        validation_digest: validationDigest,
      }).select('id, mint_amount_user, mint_amount_platform').single();

      mintRecord = mint;

      // Write balance ledger entries (immutable audit trail)
      if (mint) {
        await supabase.from('pplp_v2_balance_ledger').insert([
          {
            user_id: action.user_id,
            entry_type: 'mint_user',
            amount: mintAmountUser,
            reference_table: 'pplp_v2_mint_records',
            reference_id: mint.id,
            note: `PPLP v2 mint: action ${action_id}, LS=${finalLightScore.toFixed(4)}`,
          },
          {
            user_id: action.user_id,
            entry_type: 'mint_platform',
            amount: mintAmountPlatform,
            reference_table: 'pplp_v2_mint_records',
            reference_id: mint.id,
            note: `Platform 1% from action ${action_id}`,
          },
        ]);

        // Auto-trigger on-chain mint via FUNMoneyMinter v2
        const MINTER_V2_ADDRESS = Deno.env.get('FUN_MINTER_V2_ADDRESS');
        const MINTER_PRIVATE_KEY = Deno.env.get('MINTER_PRIVATE_KEY');
        if (mint && MINTER_V2_ADDRESS && MINTER_PRIVATE_KEY) {
          try {
            const mintResp = await fetch(`${supabaseUrl}/functions/v1/pplp-v2-onchain-mint`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ mint_record_id: mint.id }),
            });
            const mintResult = await mintResp.json();
            console.log(`[PPLP v2 Validate] On-chain mint triggered: ${JSON.stringify(mintResult)}`);
          } catch (onchainErr) {
            console.warn(`[PPLP v2 Validate] On-chain mint trigger failed (will retry):`, onchainErr);
          }
        }
      }

      // Update action to minted
      await supabase.from('pplp_v2_user_actions').update({ status: 'minted' }).eq('id', action_id);
    }

    console.log(`[PPLP v2 Validate] Action ${action_id}: LS=${finalLightScore.toFixed(4)}, status=${validationStatus}, validator=${validatorUsed}`);

    return new Response(JSON.stringify({
      success: true,
      action_id,
      validation_status: validationStatus,
      pillars: finalPillars,
      raw_light_score: rawLightScore,
      final_light_score: finalLightScore,
      multipliers: { impact: impactWeight, trust: trustMultiplier, consistency: consistencyMultiplier, attendance: attendanceMultiplier },
      mint: mintRecord ? {
        mint_amount_user: mintRecord.mint_amount_user,
        mint_amount_platform: mintRecord.mint_amount_platform,
      } : null,
      reasoning: aiScores.reasoning,
      flags: flagsList,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[PPLP v2 Validate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
