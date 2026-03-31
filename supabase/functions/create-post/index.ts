import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CONTENT_LENGTH = 20000;
const ANGEL_AI_ENDPOINT = "https://ssjoetiitctqzapymtzl.supabase.co/functions/v1/angel-chat";
const ANGEL_EVAL_TIMEOUT_MS = 8000;

interface MediaUrl {
  url: string;
  type: "image" | "video";
}

// Detect low-quality / "posting for the sake of posting" content
function detectLowQuality(content: string, mediaCount: number): boolean {
  if (mediaCount > 0) return false;
  const trimmed = content.trim();
  if (trimmed.length < 15) return true;
  const textOnly = trimmed.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Component}\s\p{P}\p{S}]/gu, '');
  if (textOnly.length === 0) return true;
  const deduped = trimmed.replace(/(.)\1{4,}/g, '$1');
  if (deduped.length <= 3) return true;
  return false;
}

interface AttachmentInput {
  file_url: string;
  storage_key: string | null;
  file_type: 'image' | 'video';
  mime_type: string;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  sort_order: number;
  alt_text?: string | null;
  transform_meta?: Record<string, unknown> | null;
}

interface CreatePostRequest {
  content: string;
  media_urls: MediaUrl[];
  image_url?: string | null;
  video_url?: string | null;
  location?: string | null;
  tagged_user_ids?: string[];
  visibility?: string;
  attachments?: AttachmentInput[];
}

function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function calculateWordOverlap(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  const overlap = wordsA.filter(w => setB.has(w)).length;
  return overlap / Math.max(wordsA.length, wordsB.length);
}

async function detectRepetitiveContent(
  supabase: any,
  userId: string,
  newContent: string,
): Promise<{ blocked: boolean; warning: boolean; similarCount: number }> {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);
  const today = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate()) - VN_OFFSET_MS);

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("content")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recentPosts || recentPosts.length === 0) {
    return { blocked: false, warning: false, similarCount: 0 };
  }

  const newWords = tokenizeWords(newContent);
  if (newWords.length === 0) return { blocked: false, warning: false, similarCount: 0 };

  let similarCount = 0;
  for (const post of recentPosts) {
    if (!post.content) continue;
    const oldWords = tokenizeWords(post.content);
    const overlap = calculateWordOverlap(newWords, oldWords);
    if (overlap > 0.95) similarCount++;
  }

  if (similarCount >= 5) {
    return { blocked: true, warning: false, similarCount };
  }
  if (similarCount >= 1) {
    return { blocked: false, warning: true, similarCount };
  }
  return { blocked: false, warning: false, similarCount: 0 };
}

function normalizeContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// === ANGEL AI CONTENT EVALUATION ===
interface AngelEvalResult {
  score: number;        // 0-10
  is_positive: boolean;
  message: string;      // Feedback message from Angel
}

async function evaluateWithAngel(content: string, hasMedia: boolean): Promise<AngelEvalResult | null> {
  const ANGEL_AI_API_KEY = Deno.env.get("ANGEL_AI_API_KEY");
  if (!ANGEL_AI_API_KEY) {
    console.warn("[create-post] ANGEL_AI_API_KEY not configured, skipping AI eval");
    return null;
  }

  // Skip AI evaluation for very short content (< 10 chars) — obvious low quality
  if (content.trim().length < 10 && !hasMedia) {
    return {
      score: 1,
      is_positive: false,
      message: "Angel nhắc nhẹ: viết từ trái tim sẽ được tặng thưởng nhiều hơn nha 🌟 Nội dung quá ngắn sẽ không nhận được CAMLY đâu ạ 💛",
    };
  }

  const prompt = `Bạn là Angel — trợ lý AI thân thiện trên mạng xã hội FUN.rich.

Hãy chấm điểm bài đăng sau trên thang 0-10 dựa trên các tiêu chí:
- Có nội dung ý nghĩa, mang giá trị tích cực cho cộng đồng
- Chia sẻ trải nghiệm thật, cảm xúc chân thành
- Không phải spam, không phải nội dung vô nghĩa chỉ để kiếm coin
- Độ dài hợp lý (bài quá ngắn, chỉ vài từ thì điểm thấp)

${hasMedia ? "(Bài viết có đính kèm hình ảnh/video)" : "(Bài viết chỉ có text, không có media)"}

Nội dung bài đăng:
"""
${content.trim().substring(0, 2000)}
"""

Trả lời CHÍNH XÁC theo định dạng JSON (không markdown, không giải thích thêm):
{"score": <số từ 0-10>, "is_positive": <true/false>, "message": "<lời nhắn nhẹ nhàng từ Angel cho người đăng bài>"}

Quy tắc cho message:
- Nếu score >= 7: khen nhẹ, động viên (VD: "Bài viết thật đẹp! Angel rất thích 💛✨")
- Nếu score 4-6: nhắc nhẹ nhàng rằng bài chưa đủ chất lượng để nhận thưởng, khuyến khích viết sâu hơn
- Nếu score < 4: nhắc nhẹ rằng nội dung quá ngắn hoặc chưa mang giá trị, khuyến khích viết từ trái tim`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANGEL_EVAL_TIMEOUT_MS);

    const response = await fetch(ANGEL_AI_ENDPOINT, {
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

    if (!response.ok) {
      console.warn("[create-post] Angel AI returned status:", response.status);
      return null;
    }

    // Handle SSE streaming response — collect all content
    const contentType = response.headers.get("content-type") || "";
    let fullContent = "";

    if (contentType.includes("text/event-stream")) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.content || parsed.text || parsed.delta?.content || parsed.choices?.[0]?.delta?.content;
            if (c) fullContent += c;
          } catch { /* partial JSON, skip */ }
        }
      }
    } else {
      const jsonResp = await response.json();
      fullContent = jsonResp.response || jsonResp.content || jsonResp.message || JSON.stringify(jsonResp);
    }

    console.log("[create-post] Angel AI raw response:", fullContent.substring(0, 500));

    // Parse JSON from Angel's response
    const jsonMatch = fullContent.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn("[create-post] Could not parse Angel AI JSON from response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.min(10, Math.max(0, Number(parsed.score) || 0));
    
    return {
      score,
      is_positive: Boolean(parsed.is_positive),
      message: String(parsed.message || ""),
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("[create-post] Angel AI evaluation timed out");
    } else {
      console.warn("[create-post] Angel AI evaluation error:", error.message);
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[create-post] Start");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[create-post] No auth header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("[create-post] Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[create-post] User verified:", userId.substring(0, 8) + "...");

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("is_banned, account_status")
      .eq("id", userId)
      .single();

    if (userProfile?.is_banned) {
      console.log("[create-post] User is banned:", userId.substring(0, 8));
      return new Response(
        JSON.stringify({ error: "Tài khoản đã bị cấm. Không thể đăng bài." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userProfile?.account_status === 'limited') {
      console.log("[create-post] User account is limited:", userId.substring(0, 8));
      return new Response(
        JSON.stringify({ error: "Vui lòng xác thực email trước khi đăng bài.", code: "ACCOUNT_LIMITED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreatePostRequest = await req.json();
    console.log("[create-post] Body received:", {
      contentLength: body.content?.length || 0,
      mediaCount: body.media_urls?.length || 0,
    });

    if (!body.content?.trim() && (!body.media_urls || body.media_urls.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Nội dung hoặc media là bắt buộc" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.content && body.content.length > MAX_CONTENT_LENGTH) {
      console.log("[create-post] Content too long:", body.content.length);
      return new Response(
        JSON.stringify({ 
          error: `Nội dung quá dài (${body.content.length.toLocaleString()}/${MAX_CONTENT_LENGTH.toLocaleString()} ký tự)`,
          code: "CONTENT_TOO_LONG"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DUPLICATE DETECTION ===
    let contentHash: string | null = null;
    let isRewardEligible = true;
    let duplicateDetected = false;

    const trimmedContent = body.content?.trim() || "";
    if (trimmedContent.length > 0) {
      const normalized = normalizeContent(trimmedContent);
      contentHash = await computeHash(normalized);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: existingPost } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(1)
        .maybeSingle();

      if (existingPost) {
        isRewardEligible = false;
        duplicateDetected = true;
        console.log("[create-post] Duplicate detected, existing post:", existingPost.id);
      }
    }

    // === LOW-QUALITY DETECTION ===
    const mediaCount = (body.media_urls || []).length;
    const isLowQuality = detectLowQuality(trimmedContent, mediaCount);
    const moderationStatus = isLowQuality ? 'pending_review' : 'approved';

    if (isLowQuality) {
      console.log("[create-post] Low-quality detected, setting pending_review");
      isRewardEligible = false;
    }

    // === REPETITIVE CONTENT DETECTION ===
    let repetitiveWarning = false;
    if (trimmedContent.length > 0) {
      const repResult = await detectRepetitiveContent(supabase, userId, trimmedContent);
      console.log("[create-post] Repetitive check:", repResult);

      if (repResult.blocked) {
        console.log("[create-post] BLOCKED — repetitive content, similarCount:", repResult.similarCount);
        return new Response(
          JSON.stringify({
            error: "Angel thấy bạn đã chia sẻ nội dung tương tự nhiều lần rồi nè 💛 Hãy dành thời gian viết những trải nghiệm thật sự của bạn nhé ✨",
            blocked: true,
            warning_message: "Angel thấy bạn đã chia sẻ nội dung tương tự nhiều lần rồi nè 💛 Hãy dành thời gian viết những trải nghiệm thật sự của bạn nhé ✨",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (repResult.warning) {
        isRewardEligible = false;
        repetitiveWarning = true;
        console.log("[create-post] Repetitive warning, no reward");
      }
    }

    // === ANGEL AI CONTENT EVALUATION ===
    // Replace old "120 chars" rule with Angel AI scoring
    let angelScore: number | null = null;
    let angelFeedback: string | null = null;
    let angelEvalUsed = false;

    if (!isLowQuality && !duplicateDetected && !repetitiveWarning && trimmedContent.length > 0) {
      const evalResult = await evaluateWithAngel(trimmedContent, mediaCount > 0);

      if (evalResult) {
        angelEvalUsed = true;
        angelScore = evalResult.score;
        angelFeedback = evalResult.message;

        console.log("[create-post] Angel AI score:", angelScore, "| is_positive:", evalResult.is_positive);

        if (angelScore >= 6) {
          isRewardEligible = true;
        } else {
          isRewardEligible = false;
          // Provide stronger message for very low scores
          if (angelScore < 3 && !angelFeedback) {
            angelFeedback = "Angel nhắc nhẹ: viết từ trái tim sẽ được tặng thưởng nhiều hơn nha 🌟 Nội dung quá ngắn hoặc chưa mang giá trị tích cực sẽ không nhận được CAMLY đâu ạ 💛";
          } else if (!angelFeedback) {
            angelFeedback = "Angel thấy bài viết này chưa thật sự truyền cảm hứng nè 💛 Hãy chia sẻ sâu hơn để nhận thưởng nhé ✨";
          }
        }
      } else {
        // FALLBACK: Angel AI unavailable — use old 120 char rule
        console.log("[create-post] Angel AI unavailable, using fallback 120-char rule");
        if (isRewardEligible && trimmedContent.length < 120) {
          isRewardEligible = false;
        }
      }
    } else if (isRewardEligible && trimmedContent.length < 120 && !isLowQuality) {
      // Fallback for edge cases where we skip Angel eval
      isRewardEligible = false;
    }

    // Insert post
    console.log("[create-post] Inserting post...", { isRewardEligible, duplicateDetected, moderationStatus, angelScore });
    const insertStart = Date.now();
    
    const validVisibilities = ['public', 'friends', 'private'];
    const visibility = validVisibilities.includes(body.visibility || '') 
      ? body.visibility 
      : 'public';

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content: trimmedContent,
        image_url: body.image_url || null,
        video_url: body.video_url || null,
        media_urls: body.media_urls || [],
        location: body.location || null,
        visibility: visibility,
        content_hash: contentHash,
        is_reward_eligible: isRewardEligible,
        moderation_status: moderationStatus,
      })
      .select("id, slug")
      .single();

    const insertDuration = Date.now() - insertStart;
    
    if (insertError) {
      console.error("[create-post] Insert error:", insertError.message, insertError.code);
      
      let errorMessage = insertError.message || "Không thể lưu bài viết";
      if (insertError.message?.includes("content_length")) {
        errorMessage = "Nội dung bài viết quá dài. Vui lòng rút gọn nội dung.";
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: insertError.code,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert tagged users if any
    if (post?.id && body.tagged_user_ids && body.tagged_user_ids.length > 0) {
      const tagsToInsert = body.tagged_user_ids.map(taggedUserId => ({
        post_id: post.id,
        tagged_user_id: taggedUserId,
      }));
      
      const { error: tagError } = await supabase
        .from("post_tags")
        .insert(tagsToInsert);
      
      if (tagError) {
        console.warn("[create-post] Tag insert error (non-fatal):", tagError.message);
      } else {
        console.log("[create-post] Tagged", tagsToInsert.length, "users");
      }
    }

    // Insert attachments if any
    if (post?.id && body.attachments && body.attachments.length > 0) {
      const attachmentsToInsert = body.attachments.map((att: AttachmentInput) => ({
        post_id: post.id,
        file_url: att.file_url,
        storage_key: att.storage_key || null,
        file_type: att.file_type || 'image',
        mime_type: att.mime_type || null,
        width: att.width || null,
        height: att.height || null,
        size_bytes: att.size_bytes || null,
        sort_order: att.sort_order ?? 0,
        alt_text: att.alt_text || null,
        transform_meta: att.transform_meta || null,
      }));

      const { error: attachError } = await supabase
        .from("post_attachments")
        .insert(attachmentsToInsert);

      if (attachError) {
        console.warn("[create-post] Attachment insert error (non-fatal):", attachError.message);
      } else {
        console.log("[create-post] Inserted", attachmentsToInsert.length, "attachments");
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log("[create-post] Success!", {
      postId: post?.id,
      insertMs: insertDuration,
      totalMs: totalDuration,
      duplicateDetected,
      isRewardEligible,
      angelScore,
      angelEvalUsed,
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        postId: post?.id,
        is_reward_eligible: isRewardEligible,
        duplicate_detected: duplicateDetected,
        repetitive_warning: repetitiveWarning,
        moderation_status: moderationStatus,
        angel_score: angelScore,
        angel_feedback: angelFeedback,
        angel_eval_used: angelEvalUsed,
        timing: { insertMs: insertDuration, totalMs: totalDuration },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[create-post] Unexpected error:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "Lỗi không xác định" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
