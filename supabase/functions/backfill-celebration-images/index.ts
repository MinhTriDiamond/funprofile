import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.includes(supabaseServiceKey)) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get all today's gift_celebration posts without images
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, content, tx_hash, gift_sender_id, gift_recipient_id, gift_token, gift_amount, gift_message, created_at")
      .eq("post_type", "gift_celebration")
      .gte("created_at", todayStart.toISOString())
      .is("image_url", null)
      .order("created_at", { ascending: true });

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts to backfill", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${posts.length} posts to backfill`);

    // Get all unique user IDs for username lookup
    const userIds = new Set<string>();
    posts.forEach((p) => {
      if (p.gift_sender_id) userIds.add(p.gift_sender_id);
      if (p.gift_recipient_id) userIds.add(p.gift_recipient_id);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(userIds));

    const usernameMap: Record<string, string> = {};
    (profiles || []).forEach((p) => {
      usernameMap[p.id] = p.username || "unknown";
    });

    const results: Array<{ post_id: string; status: string; image_url?: string; error?: string }> = [];

    // Process sequentially to avoid overwhelming AI gateway
    for (const post of posts) {
      const senderUsername = usernameMap[post.gift_sender_id] || "unknown";
      const recipientUsername = usernameMap[post.gift_recipient_id] || "unknown";
      const isClaim = post.content?.includes("nhan thuong") || post.content?.includes("nhận thưởng");

      try {
        console.log(`Generating image for post ${post.id} (${senderUsername} -> ${recipientUsername})`);

        const imgRes = await fetch(`${supabaseUrl}/functions/v1/generate-celebration-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            sender_username: senderUsername,
            recipient_username: recipientUsername,
            amount: post.gift_amount || "0",
            token_symbol: post.gift_token || "CAMLY",
            tx_hash: post.tx_hash || "unknown",
            type: isClaim ? "claim" : "gift",
          }),
        });

        if (!imgRes.ok) {
          const errText = await imgRes.text();
          console.error(`Failed for post ${post.id}: ${errText}`);
          results.push({ post_id: post.id, status: "failed", error: errText });
          continue;
        }

        const imgData = await imgRes.json();
        const imageUrl = imgData.image_url;

        if (imageUrl) {
          // Update the post with the celebration image
          const { error: updateError } = await supabase
            .from("posts")
            .update({ image_url: imageUrl })
            .eq("id", post.id);

          if (updateError) {
            console.error(`Update failed for post ${post.id}:`, updateError);
            results.push({ post_id: post.id, status: "image_generated_but_update_failed", image_url: imageUrl, error: updateError.message });
          } else {
            console.log(`✅ Post ${post.id} updated with image: ${imageUrl}`);
            results.push({ post_id: post.id, status: "success", image_url: imageUrl });
          }

          // Also update chat message if there's a donation with a message_id
          if (post.tx_hash) {
            const { data: donation } = await supabase
              .from("donations")
              .select("message_id")
              .eq("tx_hash", post.tx_hash)
              .maybeSingle();

            if (donation?.message_id) {
              await supabase
                .from("messages")
                .update({ media_urls: [{ url: imageUrl, type: "image" }] })
                .eq("id", donation.message_id);
              console.log(`  Chat message ${donation.message_id} also updated`);
            }
          }
        } else {
          results.push({ post_id: post.id, status: "no_image_returned" });
        }
      } catch (err: any) {
        console.error(`Error processing post ${post.id}:`, err);
        results.push({ post_id: post.id, status: "error", error: err.message });
      }

      // Small delay between requests to be gentle on AI gateway
      await new Promise((r) => setTimeout(r, 2000));
    }

    const successCount = results.filter((r) => r.status === "success").length;
    console.log(`Backfill complete: ${successCount}/${posts.length} succeeded`);

    return new Response(
      JSON.stringify({ 
        message: `Backfill complete`, 
        total: posts.length, 
        success: successCount, 
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
