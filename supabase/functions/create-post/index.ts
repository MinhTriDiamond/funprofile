import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CONTENT_LENGTH = 20000;

interface MediaUrl {
  url: string;
  type: "image" | "video";
}

// Detect low-quality / "posting for the sake of posting" content
function detectLowQuality(content: string, mediaCount: number): boolean {
  // Posts with media are NOT flagged (user may post a photo with short caption)
  if (mediaCount > 0) return false;

  const trimmed = content.trim();

  // Too short (< 15 chars, no media)
  if (trimmed.length < 15) return true;

  // Only emoji / special characters, no real text
  const textOnly = trimmed.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Component}\s\p{P}\p{S}]/gu, '');
  if (textOnly.length === 0) return true;

  // Repetitive gibberish: "aaaaaaa", "hahaha" → dedupe runs of 5+
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

// Tokenize Vietnamese text into words
function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

// Calculate word overlap ratio between two texts
function calculateWordOverlap(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  const overlap = wordsA.filter(w => setB.has(w)).length;
  return overlap / Math.max(wordsA.length, wordsB.length);
}

// Detect repetitive content by comparing with recent posts
async function detectRepetitiveContent(
  supabase: any,
  userId: string,
  newContent: string,
): Promise<{ blocked: boolean; warning: boolean; similarCount: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    if (overlap > 0.6) similarCount++;
  }

  if (similarCount >= 3) {
    return { blocked: true, warning: false, similarCount };
  }
  if (similarCount >= 1) {
    return { blocked: false, warning: true, similarCount };
  }
  return { blocked: false, warning: false, similarCount: 0 };
}

// Normalize content for duplicate detection
function normalizeContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

// Compute SHA-256 hash (hex) using Web Crypto API
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[create-post] Start");

  try {
    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[create-post] No auth header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user using getUser()
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

    // Check if user is banned or limited
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

    // Parse request body
    const body: CreatePostRequest = await req.json();
    console.log("[create-post] Body received:", {
      contentLength: body.content?.length || 0,
      mediaCount: body.media_urls?.length || 0,
    });

    // Validate content
    if (!body.content?.trim() && (!body.media_urls || body.media_urls.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Nội dung hoặc media là bắt buộc" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content length
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

      // Check for duplicate within 30 days
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
      isRewardEligible = false; // Pending posts don't get rewards
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

    // === SHORT CONTENT CHECK (no reward for short text-only posts) ===
    if (isRewardEligible && mediaCount === 0 && trimmedContent.length < 50) {
      console.log("[create-post] Short text-only post, no reward:", trimmedContent.length, "chars");
      isRewardEligible = false;
    }

    // Insert post
    console.log("[create-post] Inserting post...", { isRewardEligible, duplicateDetected, moderationStatus });
    const insertStart = Date.now();
    
    // Validate visibility value
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
      
      // Parse constraint errors to friendly messages
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
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        postId: post?.id,
        is_reward_eligible: isRewardEligible,
        duplicate_detected: duplicateDetected,
        repetitive_warning: repetitiveWarning,
        moderation_status: moderationStatus,
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
