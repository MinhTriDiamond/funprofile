import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const userId = url.searchParams.get("user_id");

    // Fetch public active reels with creator info
    let query = supabase
      .from("reels")
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .eq("visibility", "public")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: reels, error } = await query;

    if (error) throw error;

    // If user is logged in, fetch their like/bookmark status
    let userLikes: Set<string> = new Set();
    let userBookmarks: Set<string> = new Set();

    if (userId) {
      const reelIds = (reels || []).map((r: any) => r.id);

      const [likesRes, bookmarksRes] = await Promise.all([
        supabase
          .from("reel_likes")
          .select("reel_id")
          .eq("user_id", userId)
          .in("reel_id", reelIds),
        supabase
          .from("reel_bookmarks")
          .select("reel_id")
          .eq("user_id", userId)
          .in("reel_id", reelIds),
      ]);

      if (likesRes.data) {
        userLikes = new Set(likesRes.data.map((l: any) => l.reel_id));
      }
      if (bookmarksRes.data) {
        userBookmarks = new Set(bookmarksRes.data.map((b: any) => b.reel_id));
      }
    }

    const enrichedReels = (reels || []).map((reel: any) => ({
      ...reel,
      is_liked: userLikes.has(reel.id),
      is_bookmarked: userBookmarks.has(reel.id),
    }));

    return new Response(JSON.stringify(enrichedReels), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
