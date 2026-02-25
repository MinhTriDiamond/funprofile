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

interface CreatePostRequest {
  content: string;
  media_urls: MediaUrl[];
  image_url?: string | null;
  video_url?: string | null;
  location?: string | null;
  tagged_user_ids?: string[];
  visibility?: string;
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

    // Check if user is banned
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", userId)
      .single();

    if (userProfile?.is_banned) {
      console.log("[create-post] User is banned:", userId.substring(0, 8));
      return new Response(
        JSON.stringify({ error: "Tài khoản đã bị cấm. Không thể đăng bài." }),
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
