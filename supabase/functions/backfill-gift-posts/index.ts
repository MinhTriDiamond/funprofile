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

    // Find donations without gift_celebration posts
    const { data: donations, error: fetchError } = await supabase
      .from("donations")
      .select("id, tx_hash, sender_id, recipient_id, amount, token_symbol, message, created_at")
      .is("post_id", null)
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

    // Get profiles for senders and recipients
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
    let errors: string[] = [];

    // Process in batches of 10
    for (let i = 0; i < missing.length; i += 10) {
      const batch = missing.slice(i, i + 10);
      const postInserts = batch.map(d => {
        const sender = profileMap[d.sender_id];
        const recipient = profileMap[d.recipient_id];
        const senderName = sender?.username || "Người dùng";
        const recipientName = recipient?.display_name || recipient?.username || "User";
        const amount = parseFloat(d.amount);

        return {
          user_id: d.sender_id,
          content: `🎉 @${senderName} đã trao gửi ${amount.toLocaleString()} ${d.token_symbol} cho @${recipientName} ❤️${d.message ? `\n\n"${d.message.slice(0, 120)}"` : ''}`,
          post_type: "gift_celebration",
          tx_hash: d.tx_hash,
          gift_sender_id: d.sender_id,
          gift_recipient_id: d.recipient_id,
          gift_token: d.token_symbol,
          gift_amount: d.amount,
          gift_message: d.message || null,
          is_highlighted: false,
          visibility: "public",
          moderation_status: "approved",
          created_at: d.created_at,
        };
      });

      const { data: insertedPosts, error: insertError } = await supabase
        .from("posts")
        .insert(postInserts)
        .select("id, tx_hash");

      if (insertError) {
        errors.push(`Batch ${i}: ${insertError.message}`);
        continue;
      }

      // Link posts back to donations
      for (const post of insertedPosts || []) {
        const donation = batch.find(d => d.tx_hash === post.tx_hash);
        if (donation) {
          await supabase.from("donations").update({ post_id: post.id }).eq("id", donation.id);
        }
      }
      created += (insertedPosts || []).length;
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
