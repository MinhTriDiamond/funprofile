import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get confirmed transactions that don't have matching donations
    const { data: allTx, error: txError } = await adminClient
      .from("transactions")
      .select("id, user_id, tx_hash, from_address, to_address, amount, token_symbol, token_address, chain_id, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`);
    if (!allTx || allTx.length === 0) {
      // Still check for missing gift_celebration posts even if no new transactions
      const postsResult = await backfillGiftCelebrationPosts(adminClient);
      return new Response(JSON.stringify({ 
        message: "No transactions to check", 
        inserted: 0,
        ...postsResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check which tx_hashes already have donations
    const txHashes = allTx.map((t) => t.tx_hash).filter(Boolean);
    const { data: existingDonations } = await adminClient
      .from("donations")
      .select("tx_hash")
      .in("tx_hash", txHashes);

    const existingSet = new Set((existingDonations || []).map((d) => d.tx_hash));
    const missingTx = allTx.filter((t) => t.tx_hash && !existingSet.has(t.tx_hash));

    // 3. Build wallet_address -> profile map
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, wallet_address, public_wallet_address");

    const walletMap = new Map<string, string>();
    for (const p of profiles || []) {
      if (p.wallet_address) {
        walletMap.set(p.wallet_address.toLowerCase(), p.id);
      }
      if (p.public_wallet_address) {
        walletMap.set(p.public_wallet_address.toLowerCase(), p.id);
      }
    }

    // 4. Create donation records + notifications
    const toInsert: any[] = [];
    const notifications: any[] = [];
    const skipped: string[] = [];

    for (const tx of missingTx) {
      const recipientId = tx.to_address
        ? walletMap.get(tx.to_address.toLowerCase())
        : null;

      if (!recipientId) {
        skipped.push(tx.tx_hash);
        continue;
      }

      toInsert.push({
        sender_id: tx.user_id,
        recipient_id: recipientId,
        amount: tx.amount,
        token_symbol: tx.token_symbol,
        token_address: tx.token_address || null,
        chain_id: tx.chain_id || 56,
        tx_hash: tx.tx_hash,
        status: "confirmed",
        confirmed_at: tx.created_at,
        card_theme: "celebration",
        card_sound: "rich-1",
        message: null,
        light_score_earned: 0,
      });

      if (tx.user_id && recipientId && tx.user_id !== recipientId) {
        notifications.push({
          user_id: recipientId,
          actor_id: tx.user_id,
          type: "donation",
          read: false,
        });
      }
    }

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const { error: insertError } = await adminClient
        .from("donations")
        .insert(toInsert);

      if (insertError) {
        throw new Error(`Failed to insert donations: ${insertError.message}`);
      }
      insertedCount = toInsert.length;
    }

    if (notifications.length > 0) {
      await adminClient.from("notifications").insert(notifications);
    }

    // 5. Backfill missing gift_celebration posts
    const postsResult = await backfillGiftCelebrationPosts(adminClient);

    console.log(`[auto-backfill] Scanned: ${allTx.length}, Missing: ${missingTx.length}, Inserted: ${insertedCount}, Skipped: ${skipped.length}, Posts created: ${postsResult.posts_created}`);

    return new Response(
      JSON.stringify({
        inserted: insertedCount,
        skipped: skipped.length,
        scanned: allTx.length,
        missing: missingTx.length,
        ...postsResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-backfill-donations error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Find donations with status='confirmed' that don't have a matching gift_celebration post,
 * then create the missing posts.
 */
async function backfillGiftCelebrationPosts(adminClient: any) {
  // Get all confirmed donations
  const { data: donations, error: donErr } = await adminClient
    .from("donations")
    .select("id, sender_id, recipient_id, amount, token_symbol, tx_hash, message, created_at")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (donErr || !donations || donations.length === 0) {
    return { posts_created: 0, posts_details: [] };
  }

  // Get existing gift_celebration posts by tx_hash
  const donationTxHashes = donations.map((d: any) => d.tx_hash).filter(Boolean);
  
  // Query in batches to avoid URL length limits
  const existingPostTxHashes = new Set<string>();
  const batchSize = 100;
  for (let i = 0; i < donationTxHashes.length; i += batchSize) {
    const batch = donationTxHashes.slice(i, i + batchSize);
    const { data: existingPosts } = await adminClient
      .from("posts")
      .select("tx_hash")
      .eq("post_type", "gift_celebration")
      .in("tx_hash", batch);
    
    for (const p of existingPosts || []) {
      if (p.tx_hash) existingPostTxHashes.add(p.tx_hash);
    }
  }

  // Find donations without matching posts
  const missingDonations = donations.filter(
    (d: any) => d.tx_hash && d.sender_id && d.recipient_id && !existingPostTxHashes.has(d.tx_hash)
  );

  if (missingDonations.length === 0) {
    return { posts_created: 0, posts_details: [] };
  }

  // Fetch profiles for sender + recipient
  const userIds = new Set<string>();
  for (const d of missingDonations) {
    userIds.add(d.sender_id);
    userIds.add(d.recipient_id);
  }

  const { data: profilesData } = await adminClient
    .from("profiles")
    .select("id, username, display_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map<string, { username: string; display_name: string | null }>();
  for (const p of profilesData || []) {
    profileMap.set(p.id, { username: p.username, display_name: p.display_name });
  }

  // Build posts to insert
  const postsToInsert: any[] = [];
  const postsDetails: any[] = [];

  for (const d of missingDonations) {
    const sender = profileMap.get(d.sender_id);
    const recipient = profileMap.get(d.recipient_id);
    if (!sender || !recipient) continue;

    const senderName = sender.display_name || sender.username;
    const recipientName = recipient.display_name || recipient.username;

    postsToInsert.push({
      user_id: d.sender_id,
      content: `${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`,
      post_type: "gift_celebration",
      tx_hash: d.tx_hash,
      gift_sender_id: d.sender_id,
      gift_recipient_id: d.recipient_id,
      gift_token: d.token_symbol,
      gift_amount: d.amount,
      gift_message: d.message || null,
      is_highlighted: true,
      visibility: "public",
      moderation_status: "approved",
      created_at: d.created_at,
    });

    postsDetails.push({
      tx_hash: d.tx_hash,
      sender: sender.username,
      recipient: recipient.username,
      amount: d.amount,
      token: d.token_symbol,
    });
  }

  let postsCreated = 0;
  if (postsToInsert.length > 0) {
    const { error: postErr } = await adminClient
      .from("posts")
      .insert(postsToInsert);

    if (postErr) {
      console.error("Failed to insert gift_celebration posts:", postErr.message);
    } else {
      postsCreated = postsToInsert.length;
    }
  }

  return { posts_created: postsCreated, posts_details: postsDetails };
}
