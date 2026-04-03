import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18 },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": { symbol: "BTCB", decimals: 18 },
  "0x0910320181889fefde0bb1ca63962b0a8882e413": { symbol: "CAMLY", decimals: 3 },
};

const FUN_TOKEN_ADDRESS = "0x39a1b047d5d143f8874888cfa1d30fb2ae6f0cd6";

const MIN_AMOUNTS: Record<string, number> = {
  USDT: 0.01,
  BTCB: 0.01,
  CAMLY: 1,
  FUN: 1,
};

interface MoralisTransfer {
  transaction_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  token_decimals: string;
  token_symbol: string;
  token_name: string;
  address: string;
  block_timestamp: string;
  block_number: string;
}

function parseAmount(value: string, decimals: number): string {
  const rawValue = BigInt(value || "0");
  const divisor = BigInt(10 ** decimals);
  const intPart = rawValue / divisor;
  const fracPart = rawValue % divisor;
  return `${intPart}.${fracPart.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, "") || "0";
}

/** Fetch transfers with deep paging (up to maxPages). Stop early if we hit known tx_hashes. */
async function fetchTransfersWithPaging(
  moralisBase: string,
  walletAddr: string,
  chain: string,
  moralisHeaders: Record<string, string>,
  knownTxHashes: Set<string>,
  maxPages = 5,
): Promise<MoralisTransfer[]> {
  const allTransfers: MoralisTransfer[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    let url = `${moralisBase}/${walletAddr}/erc20/transfers?chain=${chain}&limit=50&order=DESC`;
    if (cursor) url += `&cursor=${cursor}`;

    const res = await fetch(url, { headers: moralisHeaders });
    if (!res.ok) { await res.text(); break; }

    const data = await res.json();
    const transfers: MoralisTransfer[] = data.result || [];
    if (transfers.length === 0) break;

    // Check if we hit known transactions — stop early
    let hitKnown = false;
    for (const t of transfers) {
      if (knownTxHashes.has(t.transaction_hash)) { hitKnown = true; break; }
      allTransfers.push(t);
    }
    if (hitKnown) break;

    cursor = data.cursor || null;
    if (!cursor) break;
  }

  return allTransfers;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const moralisApiKey = Deno.env.get("MORALIS_API_KEY");
    if (!moralisApiKey) {
      return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createAdminClient();

    const { data: allProfiles } = await adminClient
      .from("profiles")
      .select("id, public_wallet_address, wallet_address, external_wallet_address, username, display_name, created_at")
      .not("public_wallet_address", "is", null);

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles with wallets", newTransfers: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build wallet → profile map (all 3 wallet fields)
    const walletToProfile = new Map<string, { id: string; username: string; display_name: string | null; created_at: string }>();
    const allWalletAddresses: string[] = [];
    for (const p of allProfiles) {
      if (p.public_wallet_address) {
        const profileData = { id: p.id, username: p.username, display_name: p.display_name, created_at: p.created_at };
        const pubAddr = p.public_wallet_address.toLowerCase();
        walletToProfile.set(pubAddr, profileData);
        allWalletAddresses.push(pubAddr);
        // Map other wallet fields for sender identification
        for (const raw of [p.wallet_address, p.external_wallet_address]) {
          if (raw) {
            const addr = raw.toLowerCase();
            if (!walletToProfile.has(addr)) walletToProfile.set(addr, profileData);
          }
        }
      }
    }

    // Batch cursor
    const BATCH_SIZE = 50;
    const { data: cursorData } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "auto_scan_cursor")
      .single();

    let startIndex = 0;
    if (cursorData?.value) {
      startIndex = parseInt(cursorData.value as string) || 0;
      if (startIndex >= allWalletAddresses.length) startIndex = 0;
    }

    const endIndex = Math.min(startIndex + BATCH_SIZE, allWalletAddresses.length);
    const walletsToScan = allWalletAddresses.slice(startIndex, endIndex);
    const nextCursor = endIndex >= allWalletAddresses.length ? 0 : endIndex;

    console.log(`Scanning wallets ${startIndex}-${endIndex} of ${allWalletAddresses.length}`);

    const moralisHeaders = { "X-API-Key": moralisApiKey, Accept: "application/json" };
    const moralisBase = "https://deep-index.moralis.io/api/v2.2";

    let totalNewTransfers = 0;
    const allDonationsToInsert: Record<string, unknown>[] = [];

    // Parallel scan batches of 5 wallets
    const PARALLEL_SIZE = 5;
    for (let bi = 0; bi < walletsToScan.length; bi += PARALLEL_SIZE) {
      const parallelBatch = walletsToScan.slice(bi, bi + PARALLEL_SIZE);
      const results = await Promise.allSettled(parallelBatch.map(async (walletAddr) => {
        const recipientProfile = walletToProfile.get(walletAddr);
        if (!recipientProfile) return [];

        // Pre-fetch known tx_hashes for this recipient to enable early stopping
        const { data: recentDonations } = await adminClient
          .from("donations")
          .select("tx_hash")
          .eq("recipient_id", recipientProfile.id)
          .order("created_at", { ascending: false })
          .limit(100);
        const knownTxHashes = new Set((recentDonations || []).map(d => d.tx_hash));

        // Deep paging: up to 5 pages per chain
        const [mainnetTransfers, testnetTransfers] = await Promise.all([
          fetchTransfersWithPaging(moralisBase, walletAddr, "bsc", moralisHeaders, knownTxHashes, 5),
          fetchTransfersWithPaging(moralisBase, walletAddr, "bsc+testnet", moralisHeaders, knownTxHashes, 5),
        ]);

        const allTransfers = [...mainnetTransfers, ...testnetTransfers];

        // Filter incoming + known tokens
        const incoming = allTransfers.filter((t) => {
          const to = t.to_address?.toLowerCase();
          if (to !== walletAddr) return false;
          const contract = t.address?.toLowerCase() || "";
          return !!KNOWN_TOKENS[contract] || contract === FUN_TOKEN_ADDRESS;
        });
        if (incoming.length === 0) return [];

        // Deduplicate against DB
        const txHashes = incoming.map(t => t.transaction_hash).filter(Boolean);
        const { data: existingDonations } = await adminClient
          .from("donations")
          .select("tx_hash")
          .in("tx_hash", txHashes);
        const existingSet = new Set((existingDonations || []).map(d => d.tx_hash));
        const newTransfers = incoming.filter(t => t.transaction_hash && !existingSet.has(t.transaction_hash));

        const donations: Record<string, unknown>[] = [];
        for (const transfer of newTransfers) {
          const contractAddr = transfer.address?.toLowerCase() || "";
          const tokenInfo = KNOWN_TOKENS[contractAddr];
          const isFun = contractAddr === FUN_TOKEN_ADDRESS;
          let tokenSymbol = transfer.token_symbol || "UNKNOWN";
          let tokenDecimals = parseInt(transfer.token_decimals) || 18;
          if (tokenInfo) { tokenSymbol = tokenInfo.symbol; tokenDecimals = tokenInfo.decimals; }
          else if (isFun) { tokenSymbol = "FUN"; tokenDecimals = 18; }

          // Skip transfers before recipient registration
          const txTime = new Date(transfer.block_timestamp).getTime();
          const regTime = new Date(recipientProfile.created_at).getTime();
          if (txTime < regTime) continue;

          const amount = parseAmount(transfer.value, tokenDecimals);
          const numAmount = parseFloat(amount);
          const minAmount = MIN_AMOUNTS[tokenSymbol] ?? 0.01;
          if (numAmount <= 0 || numAmount < minAmount) continue;

          const senderAddr = transfer.from_address.toLowerCase();
          const senderProfile = walletToProfile.get(senderAddr);

          donations.push({
            sender_id: senderProfile?.id || null,
            sender_address: senderAddr,
            recipient_id: recipientProfile.id,
            amount,
            token_symbol: tokenSymbol,
            token_address: contractAddr,
            chain_id: isFun ? 97 : 56,
            tx_hash: transfer.transaction_hash,
            status: "confirmed",
            confirmed_at: transfer.block_timestamp,
            created_at: transfer.block_timestamp,
            is_external: !senderProfile,
            card_theme: "celebration",
            card_sound: "rich-1",
            message: null,
            light_score_earned: 0,
            metadata: {
              sender_name: senderProfile?.display_name || senderProfile?.username || "Ví ngoài",
              auto_scanned: true,
            },
          });
        }
        return donations;
      }));

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.length > 0) {
          allDonationsToInsert.push(...r.value);
        } else if (r.status === "rejected") {
          console.error("Parallel scan error:", r.reason);
        }
      }
    }

    // Insert donations + wallet_transfers + posts + notifications + chat
    if (allDonationsToInsert.length > 0) {
      const postsToInsert: Record<string, unknown>[] = [];
      const donationsForNotify: Record<string, unknown>[] = [];

      for (let i = 0; i < allDonationsToInsert.length; i += 50) {
        const batch = allDonationsToInsert.slice(i, i + 50);
        const { error: insertError } = await adminClient.from("donations").insert(batch);
        if (insertError) {
          console.error("Insert donations error:", insertError);
          continue;
        }
        totalNewTransfers += batch.length;

        // Insert wallet_transfers for each donation
        const walletTransfers = batch.map(d => ({
          user_id: d.recipient_id as string,
          tx_hash: d.tx_hash as string,
          direction: "in",
          token_symbol: d.token_symbol as string,
          token_address: d.token_address as string,
          amount: d.amount as string,
          counterparty_address: d.sender_address as string,
          chain_id: d.chain_id as number,
          status: "confirmed",
          created_at: d.created_at as string,
        }));

        // Deduplicate wallet_transfers
        const wtTxHashes = walletTransfers.map(w => w.tx_hash);
        const { data: existingWt } = await adminClient
          .from("wallet_transfers")
          .select("tx_hash")
          .in("tx_hash", wtTxHashes);
        const existingWtSet = new Set((existingWt || []).map(w => w.tx_hash));
        const newWt = walletTransfers.filter(w => !existingWtSet.has(w.tx_hash));
        if (newWt.length > 0) {
          const { error: wtErr } = await adminClient.from("wallet_transfers").insert(newWt);
          if (wtErr) console.error("wallet_transfers insert error:", wtErr);
          else console.log(`Inserted ${newWt.length} wallet_transfers`);
        }

        for (const d of batch) {
          const recipientId = d.recipient_id as string | null;
          if (!recipientId) continue;

          const senderId = d.sender_id as string | null;
          const senderProf = senderId ? walletToProfile.get((d.sender_address as string) || "") : null;
          const recipientProf = walletToProfile.get(
            allWalletAddresses.find(w => walletToProfile.get(w)?.id === recipientId) || ""
          );

          const senderName = senderProf?.display_name || senderProf?.username || "Ví ngoài";
          const recipientName = recipientProf?.display_name || recipientProf?.username || "Unknown";

          const isExternal = d.is_external as boolean;
          postsToInsert.push({
            user_id: senderId || recipientId,
            content: `${senderName} đã tặng ${d.amount} ${d.token_symbol} cho ${recipientName}`,
            post_type: "gift_celebration",
            tx_hash: d.tx_hash,
            gift_sender_id: senderId,
            gift_recipient_id: recipientId,
            gift_token: d.token_symbol,
            gift_amount: String(d.amount),
            gift_message: null,
            is_highlighted: true,
            highlight_expires_at: null,
            visibility: "public",
            moderation_status: "approved",
            created_at: d.created_at,
            metadata: isExternal ? {
              is_external: true,
              sender_address: d.sender_address,
              sender_name: senderName,
            } : null,
          });

          donationsForNotify.push(d);
        }
      }

      // Insert posts (deduplicated)
      if (postsToInsert.length > 0) {
        const postTxHashes = postsToInsert.map(p => p.tx_hash as string).filter(Boolean);
        const { data: existingPosts } = await adminClient
          .from("posts")
          .select("tx_hash")
          .eq("post_type", "gift_celebration")
          .in("tx_hash", postTxHashes);

        const existingPostSet = new Set((existingPosts || []).map(p => p.tx_hash));
        const newPosts = postsToInsert.filter(p => !existingPostSet.has(p.tx_hash as string));

        const insertedPostsByTx = new Map<string, string>();
        for (let i = 0; i < newPosts.length; i += 50) {
          const batch = newPosts.slice(i, i + 50);
          const { data: inserted, error: postErr } = await adminClient
            .from("posts")
            .insert(batch)
            .select("id, tx_hash");
          if (postErr) console.error("Post insert error:", postErr);
          else {
            console.log(`Created ${batch.length} gift_celebration posts`);
            for (const p of inserted || []) {
              insertedPostsByTx.set(p.tx_hash, p.id);
            }
          }
        }

        // Notifications
        const notificationsToInsert = donationsForNotify
          .filter(d => !existingPostSet.has(d.tx_hash as string))
          .map(d => ({
            user_id: d.recipient_id as string,
            actor_id: (d.sender_id as string) || (d.recipient_id as string),
            post_id: insertedPostsByTx.get(d.tx_hash as string) || null,
            type: "donation",
            read: false,
          }));

        if (notificationsToInsert.length > 0) {
          for (let i = 0; i < notificationsToInsert.length; i += 50) {
            const batch = notificationsToInsert.slice(i, i + 50);
            const { error: notifErr } = await adminClient.from("notifications").insert(batch);
            if (notifErr) console.error("Notification insert error:", notifErr);
            else console.log(`Created ${batch.length} notifications`);
          }
        }

        // Chat messages for internal donations
        for (const d of donationsForNotify) {
          if (existingPostSet.has(d.tx_hash as string)) continue;
          const senderId = d.sender_id as string;
          const recipientId = d.recipient_id as string;
          if (!senderId || !recipientId || senderId === recipientId) continue;

          try {
            const senderProf = walletToProfile.get((d.sender_address as string) || "");
            const senderName = senderProf?.display_name || senderProf?.username || "Unknown";
            const txHashShort = (d.tx_hash as string).substring(0, 10) + "...";

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
              const msgContent = `🎁 ${senderName} đã tặng bạn ${d.amount} ${d.token_symbol}!\n💰 TX: ${txHashShort}`;
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
            console.error(`Chat error for tx ${d.tx_hash}:`, chatErr);
          }
        }
      }
    }

    // Update cursor
    await adminClient
      .from("app_settings")
      .upsert({ key: "auto_scan_cursor", value: String(nextCursor) }, { onConflict: "key" });

    // Piggyback BTC scan
    let btcNewTransfers = 0;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const btcRes = await fetch(`${supabaseUrl}/functions/v1/scan-btc-transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({}),
      });
      if (btcRes.ok) {
        const btcData = await btcRes.json();
        btcNewTransfers = btcData?.newTransfers || 0;
        console.log(`BTC piggyback scan: ${btcNewTransfers} new transfers`);
      }
    } catch (btcErr) {
      console.error("BTC piggyback scan error:", btcErr);
    }

    console.log(`Auto-scan complete: ${totalNewTransfers} EVM + ${btcNewTransfers} BTC new transfers, next cursor: ${nextCursor}`);

    return new Response(
      JSON.stringify({
        newTransfers: totalNewTransfers,
        walletsScanned: walletsToScan.length,
        nextCursor,
        message: `Quét ${walletsToScan.length} ví, tìm thấy ${totalNewTransfers} giao dịch mới`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("auto-scan-donations error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
