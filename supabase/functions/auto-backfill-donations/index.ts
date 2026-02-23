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
      return new Response(JSON.stringify({ message: "No transactions to check", inserted: 0 }), {
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

    if (missingTx.length === 0) {
      return new Response(JSON.stringify({ message: "All transactions have donations", inserted: 0, scanned: allTx.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      // Create notification for recipient
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

    // Insert notifications (ignore errors to not block main flow)
    if (notifications.length > 0) {
      await adminClient.from("notifications").insert(notifications);
    }

    console.log(`[auto-backfill] Scanned: ${allTx.length}, Missing: ${missingTx.length}, Inserted: ${insertedCount}, Skipped: ${skipped.length}`);

    return new Response(
      JSON.stringify({
        inserted: insertedCount,
        skipped: skipped.length,
        scanned: allTx.length,
        missing: missingTx.length,
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
