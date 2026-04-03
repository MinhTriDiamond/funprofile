import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MEMPOOL_API = "https://mempool.space/api";
const BTC_CHAIN_ID = 0;
const BTC_DECIMALS = 8;
const MIN_CONFIRMATIONS = 1;

interface MempoolTx {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: Array<{
    prevout?: {
      scriptpubkey_address?: string;
      value?: number;
    };
  }>;
  vout: Array<{
    scriptpubkey_address?: string;
    value?: number;
  }>;
  fee?: number;
}

/** Normalize BTC address for comparison (lowercase) */
function normalizeBtcAddr(addr: string | undefined): string {
  return (addr || "").toLowerCase().trim();
}

/** Parse sender address from vin (Phase 1: use first input) */
function parseSender(tx: MempoolTx): string | null {
  if (!tx.vin || tx.vin.length === 0) return null;
  return tx.vin[0]?.prevout?.scriptpubkey_address || null;
}

/** 
 * Parse recipient outputs (exclude change back to sender).
 * Returns list of {address, valueSat} for outputs NOT going back to sender.
 */
function parseRecipientOutputs(tx: MempoolTx, senderAddr: string | null): Array<{ address: string; valueSat: number }> {
  const senderNorm = normalizeBtcAddr(senderAddr || "");
  const results: Array<{ address: string; valueSat: number }> = [];
  
  for (const vout of tx.vout) {
    const addr = vout.scriptpubkey_address;
    if (!addr) continue;
    // Skip change outputs (going back to sender)
    if (normalizeBtcAddr(addr) === senderNorm) continue;
    results.push({ address: addr, valueSat: vout.value || 0 });
  }
  
  return results;
}

/** Convert satoshis to BTC string */
function satsToBtc(sats: number): string {
  const btc = sats / 1e8;
  if (btc === 0) return "0";
  return btc.toFixed(8).replace(/\.?0+$/, "") || "0";
}

/** Fetch tx history for a BTC address from Mempool.space */
async function fetchBtcTxHistory(address: string): Promise<MempoolTx[]> {
  try {
    const res = await fetch(`${MEMPOOL_API}/address/${address}/txs`);
    if (!res.ok) {
      console.error(`Mempool API error for ${address}: ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error(`Mempool fetch error for ${address}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth: support both user-initiated (Bearer token) and cron (no auth)
    const authHeader = req.headers.get("Authorization");
    let requestUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData } = await anonClient.auth.getUser(token);
      requestUserId = userData?.user?.id || null;
    }

    const adminClient = createAdminClient();

    // Get all profiles with btc_address
    let profileQuery = adminClient
      .from("profiles")
      .select("id, btc_address, username, display_name, avatar_url, created_at")
      .not("btc_address", "is", null);

    // If user-initiated, only scan that user
    if (requestUserId) {
      profileQuery = profileQuery.eq("id", requestUserId);
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw new Error(`Profile query error: ${profileError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ scanned: 0, newTransfers: 0, message: "Không có user nào có địa chỉ BTC" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build BTC address → profile map
    const btcToProfile = new Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string }>();
    for (const p of profiles) {
      if (p.btc_address) {
        const castProfile = p as typeof p & { btc_address: string };
        btcToProfile.set(normalizeBtcAddr(castProfile.btc_address), {
          id: p.id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
        });
      }
    }

    // Also load ALL btc addresses for counterparty mapping
    if (!requestUserId) {
      // Already have all profiles
    } else {
      const { data: allBtcProfiles } = await adminClient
        .from("profiles")
        .select("id, btc_address, username, display_name, avatar_url, created_at")
        .not("btc_address", "is", null);
      for (const p of allBtcProfiles || []) {
        if (p.btc_address) {
          const castP = p as typeof p & { btc_address: string };
          const key = normalizeBtcAddr(castP.btc_address);
          if (!btcToProfile.has(key)) {
            btcToProfile.set(key, {
              id: p.id,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              created_at: p.created_at,
            });
          }
        }
      }
    }

    let totalNewTransfers = 0;

    // Process each profile (batch 10 at a time to respect rate limits)
    const batchSize = 10;
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);

      for (const profile of batch) {
        if (!profile.btc_address) continue;
        const castProfile = profile as typeof profile & { btc_address: string };
        const myAddr = normalizeBtcAddr(castProfile.btc_address);
        const userRegTime = new Date(profile.created_at).getTime();

        // Fetch tx history
        const txs = await fetchBtcTxHistory(castProfile.btc_address);
        if (txs.length === 0) continue;

        // Filter: confirmed + after registration
        const confirmedTxs = txs.filter(tx => {
          if (!tx.status.confirmed) return false;
          if (!tx.status.block_time) return false;
          const txTime = tx.status.block_time * 1000;
          return txTime >= userRegTime;
        });

        if (confirmedTxs.length === 0) continue;

        // Check existing tx_hashes for THIS user (allow same tx_hash for different recipients)
        const txIds = confirmedTxs.map(tx => tx.txid);
        const { data: existingDonations } = await adminClient
          .from("donations")
          .select("tx_hash, recipient_id")
          .in("tx_hash", txIds);
        // Build set of "tx_hash__recipient_id" to allow multi-recipient
        const existingDonationKeys = new Set(
          (existingDonations || []).map(d => `${d.tx_hash}__${d.recipient_id}`)
        );
        // Also track which tx_hashes have ANY record for this user as sender
        const existingSenderKeys = new Set(
          (existingDonations || [])
            .filter(d => d.recipient_id === profile.id)
            .map(d => d.tx_hash)
        );

        // Don't filter newTxs by existingSet — filter per-output instead
        const newTxs = confirmedTxs;

        const donationsToInsert: Record<string, unknown>[] = [];
        const walletTransfersToInsert: Record<string, unknown>[] = [];

        for (const tx of newTxs) {
          const senderAddr = parseSender(tx);
          const senderNorm = normalizeBtcAddr(senderAddr || "");
          const recipientOutputs = parseRecipientOutputs(tx, senderAddr);
          const feeSats = tx.fee || 0;
          const blockTime = tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : new Date().toISOString();

          // Determine if this user is sender or recipient
          const isSender = senderNorm === myAddr;

          for (const output of recipientOutputs) {
            const recipientNorm = normalizeBtcAddr(output.address);
            const isRecipient = recipientNorm === myAddr;

            // Skip if user is neither sender nor recipient of this output
            if (!isSender && !isRecipient) continue;

            // Skip if this specific tx_hash + recipient already exists in DB
            const recipientProfile = btcToProfile.get(recipientNorm);
            const donationDedupKey = `${tx.txid}__${recipientProfile?.id || ""}`;
            if (existingDonationKeys.has(donationDedupKey)) continue;

            const senderProfile = btcToProfile.get(senderNorm);
            const recipientProfile = btcToProfile.get(recipientNorm);
            const amount = satsToBtc(output.valueSat);
            const numAmount = parseFloat(amount);

            // Skip dust amounts
            if (numAmount < 0.00001) continue;

            const isRecognizedByFun = !!senderProfile && !!recipientProfile;

            // Determine direction for wallet_transfers
            const direction = isSender ? "out" : "in";
            const counterpartyAddr = isSender ? output.address : (senderAddr || "");

            // Create donation record (for FUN-recognized transfers)
            if (isRecognizedByFun) {
              donationsToInsert.push({
                sender_id: senderProfile!.id,
                sender_address: senderAddr,
                recipient_id: recipientProfile!.id,
                amount,
                token_symbol: "BTC",
                token_address: null,
                chain_id: BTC_CHAIN_ID,
                chain_family: "bitcoin",
                tx_hash: tx.txid,
                status: "confirmed",
                confirmed_at: blockTime,
                created_at: blockTime,
                is_external: false,
                fee: satsToBtc(feeSats),
                confirmations: MIN_CONFIRMATIONS,
                block_height: tx.status.block_height || null,
                card_theme: "celebration",
                card_sound: "rich-1",
                message: null,
                light_score_earned: 0,
                metadata: {
                  chain_family: "bitcoin",
                  sender_name: senderProfile!.display_name || senderProfile!.username,
                  recipient_name: recipientProfile!.display_name || recipientProfile!.username,
                },
              });
            } else if (isRecipient && recipientProfile && !senderProfile) {
              // External wallet → FUN user: create donation with is_external: true
              donationsToInsert.push({
                sender_id: null,
                sender_address: senderAddr,
                recipient_id: recipientProfile.id,
                amount,
                token_symbol: "BTC",
                token_address: null,
                chain_id: BTC_CHAIN_ID,
                chain_family: "bitcoin",
                tx_hash: tx.txid,
                status: "confirmed",
                confirmed_at: blockTime,
                created_at: blockTime,
                is_external: true,
                fee: satsToBtc(feeSats),
                confirmations: MIN_CONFIRMATIONS,
                block_height: tx.status.block_height || null,
                card_theme: "celebration",
                card_sound: "rich-1",
                message: null,
                light_score_earned: 0,
                metadata: {
                  chain_family: "bitcoin",
                  is_external: true,
                  sender_address: senderAddr,
                  sender_name: "Ví ngoài",
                  recipient_name: recipientProfile.display_name || recipientProfile.username,
                },
              });
            }

            // Create wallet_transfer record (always, for history)
            walletTransfersToInsert.push({
              user_id: profile.id,
              tx_hash: tx.txid,
              direction,
              token_symbol: "BTC",
              token_address: null,
              amount,
              counterparty_address: counterpartyAddr,
              chain_id: BTC_CHAIN_ID,
              chain_family: "bitcoin",
              fee: satsToBtc(feeSats),
              confirmations: MIN_CONFIRMATIONS,
              status: "confirmed",
              created_at: blockTime,
            });
          }
        }

        // Insert donations
        if (donationsToInsert.length > 0) {
          // Deduplicate by tx_hash + recipient_id (one TX can have multiple recipients)
          const dedupKey = (d: Record<string, unknown>) => `${d.tx_hash}__${d.recipient_id}`;
          const dedupedDonations = Array.from(
            new Map(donationsToInsert.map(d => [dedupKey(d), d])).values()
          );

          const { data: inserted, error: insertErr } = await adminClient
            .from("donations")
            .insert(dedupedDonations)
            .select("id, tx_hash, sender_id, recipient_id, amount, token_symbol");

          if (insertErr) {
            console.error("BTC donations insert error:", insertErr);
          } else {
            totalNewTransfers += (inserted || []).length;
            console.log(`Inserted ${(inserted || []).length} BTC donations for user ${profile.username}`);

            // Create gift_celebration posts
            const postsToInsert: Record<string, unknown>[] = [];
            for (const d of dedupedDonations) {
              const senderName = (d.metadata as Record<string, unknown>)?.sender_name || "Unknown";
              const recipientName = (d.metadata as Record<string, unknown>)?.recipient_name || "Unknown";

              const postUserId = (d.sender_id || d.recipient_id) as string;
              if (!postUserId) continue;
              postsToInsert.push({
                user_id: postUserId,
                content: `🎉 ${senderName} đã trao gửi ${d.amount} BTC cho ${recipientName} ❤️`,
                post_type: "gift_celebration",
                tx_hash: d.tx_hash,
                gift_sender_id: d.sender_id,
                gift_recipient_id: d.recipient_id,
                gift_token: "BTC",
                gift_amount: String(d.amount),
                gift_message: null,
                is_highlighted: true,
                highlight_expires_at: null,
                visibility: "public",
                moderation_status: "approved",
                created_at: d.created_at,
                metadata: { chain_family: "bitcoin" },
              });
            }

            // Deduplicate posts
            const postTxHashes = postsToInsert.map(p => p.tx_hash as string).filter(Boolean);
            if (postTxHashes.length > 0) {
              const { data: existingPosts } = await adminClient
                .from("posts")
                .select("tx_hash")
                .eq("post_type", "gift_celebration")
                .in("tx_hash", postTxHashes);
              const existingPostSet = new Set((existingPosts || []).map(p => p.tx_hash));
              const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

              const insertedPostsByTx = new Map<string, string>();
              if (newPosts.length > 0) {
                const { data: insertedPosts, error: postErr } = await adminClient
                  .from("posts")
                  .insert(newPosts)
                  .select("id, tx_hash");
                if (postErr) console.error("BTC post insert error:", postErr);
                else {
                  for (const p of insertedPosts || []) {
                    insertedPostsByTx.set(p.tx_hash, p.id);
                  }
                  console.log(`Created ${newPosts.length} BTC gift_celebration posts`);
                }
              }

              // Notifications
              const notificationsToInsert = dedupedDonations
                .filter(d => !existingPostSet.has(d.tx_hash as string) && d.recipient_id && d.sender_id)
                .map(d => ({
                  user_id: d.recipient_id as string,
                  actor_id: d.sender_id as string,
                  post_id: insertedPostsByTx.get(d.tx_hash as string) || null,
                  type: "donation",
                  read: false,
                }));

              // For external donations (no sender_id), create notification with recipient as actor
              const externalNotifications = dedupedDonations
                .filter(d => !existingPostSet.has(d.tx_hash as string) && d.recipient_id && !d.sender_id)
                .map(d => ({
                  user_id: d.recipient_id as string,
                  actor_id: d.recipient_id as string,
                  post_id: insertedPostsByTx.get(d.tx_hash as string) || null,
                  type: "donation",
                  read: false,
                }));
              notificationsToInsert.push(...externalNotifications);

              if (notificationsToInsert.length > 0) {
                const { error: notifErr } = await adminClient.from("notifications").insert(notificationsToInsert);
                if (notifErr) console.error("BTC notification error:", notifErr);
              }

              // Auto chat messages
              for (const d of dedupedDonations) {
                if (existingPostSet.has(d.tx_hash as string)) continue;
                const senderId = d.sender_id as string;
                const recipientId = d.recipient_id as string;
                if (!senderId || !recipientId || senderId === recipientId) continue;

                try {
                  const senderName = (d.metadata as Record<string, unknown>)?.sender_name || "Unknown";
                  const txHashShort = (d.tx_hash as string).substring(0, 10) + "...";

                  // Find or create conversation
                  const { data: existingConvs } = await adminClient
                    .from("conversations")
                    .select("id, conversation_participants!inner(user_id)")
                    .eq("type", "direct");

                  let conversationId: string | null = null;
                  if (existingConvs) {
                    for (const conv of existingConvs) {
                      const parts = (conv.conversation_participants as { user_id: string }[]).map(p => p.user_id);
                      if (parts.length === 2 && parts.includes(senderId) && parts.includes(recipientId)) {
                        conversationId = conv.id;
                        break;
                      }
                    }
                  }

                  if (!conversationId) {
                    const { data: newConv } = await adminClient
                      .from("conversations")
                      .insert({ type: "direct", created_by: senderId })
                      .select("id")
                      .single();
                    if (newConv) {
                      conversationId = newConv.id;
                      await adminClient.from("conversation_participants").insert([
                        { conversation_id: conversationId, user_id: senderId, role: "member" },
                        { conversation_id: conversationId, user_id: recipientId, role: "member" },
                      ]);
                    }
                  }

                  if (conversationId) {
                    const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} BTC trên mạng Bitcoin!\n₿ TX: ${txHashShort}\n🔗 https://mempool.space/tx/${d.tx_hash}`;
                    await adminClient.from("messages").insert({
                      conversation_id: conversationId,
                      sender_id: senderId,
                      content: msgContent,
                    });
                    await adminClient.from("conversations").update({
                      last_message_at: new Date().toISOString(),
                      last_message_preview: msgContent.substring(0, 100),
                    }).eq("id", conversationId);
                  }
                } catch (chatErr) {
                  console.error(`BTC chat error for tx ${d.tx_hash}:`, chatErr);
                }
              }
            }
          }
        }

        // Insert wallet_transfers
        if (walletTransfersToInsert.length > 0) {
          const wtTxHashes = walletTransfersToInsert.map(w => w.tx_hash as string);
          const { data: existingWt } = await adminClient
            .from("wallet_transfers")
            .select("tx_hash")
            .in("tx_hash", wtTxHashes)
            .eq("user_id", profile.id);
          const existingWtSet = new Set((existingWt || []).map(w => w.tx_hash));
          const newWt = walletTransfersToInsert.filter(w => !existingWtSet.has(w.tx_hash as string));

          if (newWt.length > 0) {
            const { error: wtErr } = await adminClient.from("wallet_transfers").insert(newWt);
            if (wtErr) console.error("BTC wallet_transfers error:", wtErr);
            else console.log(`Inserted ${newWt.length} BTC wallet_transfers for ${profile.username}`);
          }
        }

        // Small delay between users to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({
        scanned: profiles.length,
        newTransfers: totalNewTransfers,
        message: totalNewTransfers > 0
          ? `Tìm thấy ${totalNewTransfers} giao dịch BTC mới`
          : "Không có giao dịch BTC mới",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("scan-btc-transactions error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
