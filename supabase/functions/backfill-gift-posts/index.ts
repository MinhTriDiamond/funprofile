import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find donations without gift_celebration posts, must have sender_id
    const { data: donations, error: fetchError } = await supabase
      .from("donations")
      .select("id, tx_hash, sender_id, recipient_id, amount, token_symbol, message, created_at")
      .is("post_id", null)
      .not("sender_id", "is", null)
      .not("recipient_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!donations || donations.length === 0) {
      return new Response(JSON.stringify({ message: "No donations to backfill", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter: only those truly missing a gift_celebration post
    const txHashes = donations.map(d => d.tx_hash);
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("tx_hash")
      .eq("post_type", "gift_celebration")
      .in("tx_hash", txHashes);

    const existingSet = new Set((existingPosts || []).map(p => p.tx_hash));
    const missing = donations.filter(d => !existingSet.has(d.tx_hash));

    if (missing.length === 0) {
      return new Response(JSON.stringify({ message: "All donations already have posts", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get profiles
    const userIds = [...new Set([...missing.map(d => d.sender_id), ...missing.map(d => d.recipient_id)].filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    const profileMap: Record<string, { username: string; display_name: string | null }> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = { username: p.username, display_name: p.display_name };
    }

    let created = 0;
    const errors: string[] = [];

    // Process one by one to avoid batch failures
    for (const d of missing) {
      try {
        const sender = profileMap[d.sender_id];
        const recipient = profileMap[d.recipient_id];
        if (!sender || !recipient) {
          errors.push(`${d.tx_hash.slice(0,10)}: missing profile`);
          continue;
        }
        const senderName = sender.username || "Người dùng";
        const recipientName = recipient.display_name || recipient.username || "User";
        const amount = parseFloat(d.amount);
        // Sanitize message - remove any problematic chars
        const safeMessage = d.message ? d.message.replace(/[\x00-\x1F]/g, ' ').slice(0, 120) : null;

        const { data: post, error: insertError } = await supabase
          .from("posts")
          .insert({
            user_id: d.sender_id,
            content: `🎉 @${senderName} đã trao gửi ${amount.toLocaleString()} ${d.token_symbol} cho @${recipientName} ❤️${safeMessage ? `\n\n"${safeMessage}"` : ''}`,
            post_type: "gift_celebration",
            tx_hash: d.tx_hash,
            gift_sender_id: d.sender_id,
            gift_recipient_id: d.recipient_id,
            gift_token: d.token_symbol,
            gift_amount: String(d.amount),
            gift_message: safeMessage,
            is_highlighted: false,
            visibility: "public",
            moderation_status: "approved",
            created_at: d.created_at,
            media_urls: null,
            metadata: {},
          })
          .select("id")
          .single();

        if (insertError) {
          errors.push(`${d.tx_hash.slice(0,10)}: ${insertError.message}`);
          continue;
        }

        // Link post to donation
        if (post) {
          await supabase.from("donations").update({ post_id: post.id }).eq("id", d.id);
          created++;
        }
      } catch (e) {
        errors.push(`${d.tx_hash.slice(0,10)}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ created, total_missing: missing.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backfill-gift-posts error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
